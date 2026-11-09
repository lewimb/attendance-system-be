import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsOrder,
  type FindOptionsWhere,
  Repository,
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
    const existing = await this.existing(payload.email, payload.employeeCode);

    if (existing) {
      throw new RpcException({
        statusCode: 409,
        message:
          existing.email === payload.email
            ? 'Email already registered'
            : 'Employee code already exists',
      });
    }

    const employee = this.employeeRepository.create({
      ...payload,
      password: await bcrypt.hash(payload.password, SALT_ROUNDS),
    });

    const saved = await this.employeeRepository.save(employee);

    const { password: _password, ...result } = saved;
    return result;
  }

  async update(payload: UpdateEmployeePayload) {
    const {
      id,
      password: _password,
      ...data
    } = payload as UpdateEmployeePayload & { password?: string };

    const result = await this.employeeRepository.update(
      { id: String(id) },
      data,
    );
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
}
