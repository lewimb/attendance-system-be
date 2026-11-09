import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity.js';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  findAll(): Promise<Pick<Department, 'id' | 'name'>[]> {
    return this.departmentRepository.find({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }
}
