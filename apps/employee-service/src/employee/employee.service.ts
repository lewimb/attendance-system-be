import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type CreateEmployeeDto,
  Employee,
  type FindAllEmployeesPayload,
  type Paginated,
  type UpdateEmployeePayload,
} from '@app/common';

const SALT_ROUNDS = 10;

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findAll({
    page,
    limit,
  }: FindAllEmployeesPayload): Promise<Paginated<Employee>> {
    const [items, total] = await this.employeeRepository.findAndCount({
      relations: { role: true },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
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
}
