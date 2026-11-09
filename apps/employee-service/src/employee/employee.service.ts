import { Injectable } from '@nestjs/common';
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
}
