import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsOrder,
  type FindOptionsWhere,
  QueryFailedError,
  Repository,
  type UpdateResult,
} from 'typeorm';
import {
  type CreateEmployeeDto,
  Employee,
  type EmployeeSummary,
  type FindAllEmployeesPayload,
  type FindEmployeeIdsByDepartmentPayload,
  type FindEmployeesByIdsPayload,
  type Paginated,
  type UpdateEmployeePayload,
} from '@app/common';
import { Department } from '../department/department.entity.js';

const SALT_ROUNDS = 10;

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findAll({
    departmentId,
    isActive,
    sortBy = 'id',
    order = 'ASC',
    page,
    limit,
  }: FindAllEmployeesPayload): Promise<Paginated<Employee>> {
    const where: FindOptionsWhere<Employee> = {};
    if (departmentId !== undefined) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    const orderBy: FindOptionsOrder<Employee> = { [sortBy]: order };
    if (sortBy !== 'id') orderBy.id = 'ASC';

    const [items, total] = await this.employeeRepository.findAndCount({
      where,
      relations: { role: true },
      order: orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findIdsByDepartment({
    departmentId,
  }: FindEmployeeIdsByDepartmentPayload): Promise<string[]> {
    const employees = await this.employeeRepository.find({
      select: { id: true },
      where: { departmentId },
    });

    return employees.map((employee) => employee.id);
  }

  findByIds({ ids }: FindEmployeesByIdsPayload): Promise<EmployeeSummary[]> {
    if (ids.length === 0) return Promise.resolve([]);

    return this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin(
        Department,
        'department',
        'department.id = employee.departmentId',
      )
      .select('employee.id', 'id')
      .addSelect('employee.employeeCode', 'employeeCode')
      .addSelect('employee.fullName', 'fullName')
      .addSelect('employee.departmentId', 'departmentId')
      .addSelect('department.name', 'departmentName')
      .where('employee.id IN (:...ids)', { ids })
      .getRawMany<EmployeeSummary>();
  }

  async findOneById(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: String(id) },
      relations: { role: true },
    });

    if (!employee) {
      throw new RpcException({
        statusCode: 404,
        message: 'Employee not found',
      });
    }

    return employee;
  }

  async existing(
    email: string,
    employeeCode: string,
  ): Promise<Employee | null> {
    return await this.employeeRepository.findOne({
      where: [{ email: email }, { employeeCode: employeeCode }],
    });
  }

  async create(
    payload: CreateEmployeeDto,
  ): Promise<Omit<Employee, 'password'>> {
    const email = this.normalizeEmail(payload.email);
    const existing = await this.existing(email, payload.employeeCode);

    if (existing) {
      throw new RpcException({
        statusCode: 409,
        message:
          existing.email.toLowerCase() === email
            ? 'Email already registered'
            : 'Employee code already exists',
      });
    }

    const employee = this.employeeRepository.create({
      ...payload,
      email,
      password: await bcrypt.hash(payload.password, SALT_ROUNDS),
    });

    let saved: Employee;
    try {
      saved = await this.employeeRepository.save(employee);
    } catch (err) {
      throw this.conflictFrom(err) ?? err;
    }

    const { password: _password, ...result } = saved;
    return result;
  }

  async update(payload: UpdateEmployeePayload) {
    const {
      id,
      password: _password,
      employeeCode: _employeeCode,
      ...data
    } = payload as UpdateEmployeePayload & {
      password?: string;
      employeeCode?: string;
    };

    if (data.email !== undefined) data.email = this.normalizeEmail(data.email);

    let result: UpdateResult;
    try {
      result = await this.employeeRepository.update({ id: String(id) }, data);
    } catch (err) {
      throw this.conflictFrom(err) ?? err;
    }

    if (result.affected === 0)
      throw new RpcException({
        statusCode: 404,
        message: 'Employee not found',
      });
  }

  async deactivate(id: number) {
    const result = await this.employeeRepository.update(
      { id: String(id) },
      { isActive: false },
    );

    if (result.affected === 0)
      throw new RpcException({
        statusCode: 404,
        message: 'Employee not found',
      });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private conflictFrom(err: unknown): RpcException | undefined {
    if (!(err instanceof QueryFailedError)) return undefined;

    const { code, sqlMessage } = err.driverError as {
      code?: string;
      sqlMessage?: string;
    };
    if (code !== 'ER_DUP_ENTRY') return undefined;

    const key = /for key '(?:[^']*\.)?([^']+)'/.exec(sqlMessage ?? '')?.[1];
    return new RpcException({
      statusCode: 409,
      message:
        key === 'email'
          ? 'Email already registered'
          : 'Employee code already exists',
    });
  }
}
