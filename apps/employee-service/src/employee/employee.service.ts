import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  type FindAllEmployeesPayload,
  type Paginated,
} from '@app/common';

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
}
