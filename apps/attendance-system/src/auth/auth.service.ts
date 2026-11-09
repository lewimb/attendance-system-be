import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Auth } from './auth.interface.js';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Employee } from '@app/common';
import { comparePassword } from '../common/utils/password.util.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './refresh-token.entity.js';
import { jwtClaims } from './jwt-claims.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RefreshToken)
    private readonly refreshToken: Repository<RefreshToken>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // Token Related

  private createHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async validateToken(token: string) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      role: string;
    }>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
      ...jwtClaims(this.config),
    });

    return payload;
  }

  private async generateToken(employee: Employee) {
    const payload = {
      sub: employee.id,
      role: employee.role.roleName,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
        jwtid: randomUUID(),
        algorithm: 'HS256',
        ...jwtClaims(this.config),
      }),

      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
        jwtid: randomUUID(),
        algorithm: 'HS256',
        ...jwtClaims(this.config),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(refreshToken: string, employeeId: string) {
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);

    await this.refreshToken.save({
      employeeId,
      tokenHash: this.createHash(refreshToken),
      expiresAt: new Date(exp * 1000),
    });
  }

  private async revokedRefreshToken(refreshToken: string) {
    const tokenHash = this.createHash(refreshToken);

    await this.refreshToken.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokedRefreshTokenById(id: number | string) {
    await this.refreshToken.update(
      { employeeId: String(id), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // Logic Related
  async login(auth: Auth) {
    const employee = await this.employeeRepository.findOne({
      where: { email: auth.email.trim().toLowerCase() },
      relations: { role: true },
      select: {
        id: true,
        email: true,
        isActive: true,
        password: true,
        role: { id: true, roleName: true },
      },
    });

    if (
      !employee ||
      !employee.isActive ||
      !(await comparePassword(auth.password, employee.password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokenObj = await this.generateToken(employee);

    await this.saveRefreshToken(tokenObj.refreshToken, employee.id);

    return {
      refreshToken: tokenObj.refreshToken,
      accessToken: tokenObj.accessToken,
    };
  }

  async logout(token: string) {
    await this.revokedRefreshToken(token);
  }

  async refresh(token: string | undefined) {
    try {
      if (!token) throw new UnauthorizedException('Missing refresh token');

      await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
        ...jwtClaims(this.config),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.refreshToken.findOne({
      where: { tokenHash: this.createHash(token) },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.replacedAt) {
      await this.revokedRefreshTokenById(stored.employeeId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.revokedAt)
      throw new UnauthorizedException('Invalid refresh token');

    if (stored.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expired');

    const employee = await this.employeeRepository.findOne({
      where: { id: stored.employeeId },
      relations: { role: true },
    });

    if (!employee || !employee.isActive)
      throw new UnauthorizedException('Invalid refresh token');

    const { affected } = await this.refreshToken.update(
      { id: stored.id, replacedAt: IsNull(), revokedAt: IsNull() },
      { replacedAt: new Date() },
    );
    if (!affected) throw new UnauthorizedException('Invalid refresh token');

    const tokenObj = await this.generateToken(employee);

    await this.saveRefreshToken(tokenObj.refreshToken, employee.id);

    return {
      refreshToken: tokenObj.refreshToken,
      accessToken: tokenObj.accessToken,
    };
  }

  async me(token: string | undefined): Promise<Employee> {
    if (!token) throw new UnauthorizedException();

    const payload = await this.validateToken(token);

    const employee = await this.employeeRepository.findOne({
      where: { id: payload.sub },
      relations: { role: true },
      select: {
        password: false,
      },
    });

    if (!employee) {
      throw new UnauthorizedException();
    }

    return employee;
  }
}
