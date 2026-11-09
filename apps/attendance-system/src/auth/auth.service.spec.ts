import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '@app/common';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './refresh-token.entity.js';

const SECRETS: Record<string, string> = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
};

describe('AuthService', () => {
  const jwt = new JwtService();
  const refreshTokens = { findOne: vi.fn(), update: vi.fn(), save: vi.fn() };
  const employees = { findOne: vi.fn() };
  let service: AuthService;

  const signRefresh = (audience = 'attendance-web') =>
    jwt.signAsync(
      { sub: '7', role: 'EMPLOYEE' },
      {
        secret: SECRETS.JWT_REFRESH_SECRET,
        expiresIn: '7d',
        issuer: 'attendance-app',
        audience,
      },
    );

  const storedToken = (overrides: Partial<RefreshToken> = {}) => ({
    id: '1',
    employeeId: '7',
    replacedAt: null,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, fallback?: string) => fallback,
            getOrThrow: (key: string) => SECRETS[key],
          },
        },
        { provide: getRepositoryToken(Employee), useValue: employees },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokens },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should rotate a valid refresh token and issue tokens with iss, aud and jti', async () => {
    refreshTokens.findOne.mockResolvedValue(storedToken());
    refreshTokens.update.mockResolvedValue({ affected: 1 });
    employees.findOne.mockResolvedValue({
      id: '7',
      isActive: true,
      role: { roleName: 'EMPLOYEE' },
    });

    const result = await service.refresh(await signRefresh());
    const claims = jwt.decode<Record<string, unknown>>(result.accessToken);

    expect(claims).toMatchObject({
      sub: '7',
      role: 'EMPLOYEE',
      iss: 'attendance-app',
      aud: 'attendance-web',
    });
    expect(claims.jti).toEqual(expect.any(String));
    expect(claims).not.toHaveProperty('email');
    expect(refreshTokens.save).toHaveBeenCalledOnce();
  });

  it('should revoke every live token of the employee when a replaced token is reused', async () => {
    refreshTokens.findOne.mockResolvedValue(
      storedToken({ replacedAt: new Date() }),
    );

    await expect(service.refresh(await signRefresh())).rejects.toThrow(
      'Refresh token reuse detected',
    );
    expect(refreshTokens.update).toHaveBeenCalledWith(
      { employeeId: '7', revokedAt: expect.anything() },
      { revokedAt: expect.any(Date) },
    );
    expect(refreshTokens.save).not.toHaveBeenCalled();
  });

  it('should reject a revoked token without revoking the others', async () => {
    refreshTokens.findOne.mockResolvedValue(
      storedToken({ revokedAt: new Date() }),
    );

    await expect(service.refresh(await signRefresh())).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(refreshTokens.update).not.toHaveBeenCalled();
  });

  it('should reject a refresh token for another audience', async () => {
    await expect(
      service.refresh(await signRefresh('someone-else')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshTokens.findOne).not.toHaveBeenCalled();
  });
});
