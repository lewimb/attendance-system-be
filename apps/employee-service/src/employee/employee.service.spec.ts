import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { type CreateEmployeeDto, Employee } from '@app/common';
import { EmployeeService } from './employee.service.js';

const duplicateEntry = (key: string) =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('Duplicate entry'), {
      code: 'ER_DUP_ENTRY',
      sqlMessage: `Duplicate entry 'x' for key 'employees.${key}'`,
    }),
  );

describe('EmployeeService', () => {
  const repository = {
    findOne: vi.fn(),
    create: vi.fn((data: unknown) => data),
    save: vi.fn(),
    update: vi.fn(),
  };
  let service: EmployeeService;

  const dto: CreateEmployeeDto = {
    employeeCode: 'EMP001',
    fullName: 'Jane Doe',
    email: '  Jane@Example.COM ',
    password: 'secret123',
    roleId: 2,
    departmentId: 1,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: getRepositoryToken(Employee), useValue: repository },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  it('should store the email trimmed and lowercased', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation((data: unknown) =>
      Promise.resolve(data),
    );

    const result = await service.create(dto);

    expect(result.email).toBe('jane@example.com');
  });

  it('should return 409 when a parallel create wins the race on the email', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockRejectedValue(duplicateEntry('email'));

    const error = await service.create(dto).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual({
      statusCode: 409,
      message: 'Email already registered',
    });
  });

  it('should return 409 when an update uses an email that is taken', async () => {
    repository.update.mockRejectedValue(duplicateEntry('email'));

    const error = await service
      .update({ id: 1, email: 'taken@example.com' })
      .catch((err: unknown) => err);

    expect((error as RpcException).getError()).toEqual({
      statusCode: 409,
      message: 'Email already registered',
    });
  });

  it('should never change the employee code on update', async () => {
    repository.update.mockResolvedValue({ affected: 1 });

    await service.update({
      id: 1,
      fullName: 'Jane Smith',
      employeeCode: 'HACKED',
    } as Parameters<EmployeeService['update']>[0]);

    expect(repository.update).toHaveBeenCalledWith(
      { id: '1' },
      { fullName: 'Jane Smith' },
    );
  });
});
