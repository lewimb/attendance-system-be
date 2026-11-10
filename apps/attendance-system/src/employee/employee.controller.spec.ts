import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { EMPLOYEE_PATTERNS, EMPLOYEE_SERVICE } from '@app/common';
import { EmployeeController } from './employee.controller.js';
import { AuthService } from '../auth/auth.service.js';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  const client = { send: vi.fn() };

  const list = (search: unknown) =>
    controller.findAllEmployee(
      search,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      10,
    );

  beforeEach(async () => {
    vi.clearAllMocks();
    client.send.mockReturnValue(
      of({ items: [], total: 0, page: 1, limit: 10 }),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: EMPLOYEE_SERVICE, useValue: client },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send the trimmed search to the employee service', async () => {
    await list('  budi ');

    expect(client.send).toHaveBeenCalledWith(
      EMPLOYEE_PATTERNS.FIND_ALL,
      expect.objectContaining({ search: 'budi' }),
    );
  });

  it('should drop a blank search', async () => {
    await list('   ');

    expect(client.send).toHaveBeenCalledWith(
      EMPLOYEE_PATTERNS.FIND_ALL,
      expect.objectContaining({ search: undefined }),
    );
  });

  it('should reject a repeated search param', () => {
    expect(() => list(['budi', 'adi'])).toThrow(BadRequestException);
  });

  it('should reject a search longer than 100 characters', () => {
    expect(() => list('a'.repeat(101))).toThrow(BadRequestException);
  });
});
