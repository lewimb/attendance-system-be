import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DEPARTMENT_PATTERNS } from '@app/common';
import { DepartmentService } from './department.service.js';

@Controller()
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @MessagePattern(DEPARTMENT_PATTERNS.FIND_ALL)
  findAll() {
    return this.departmentService.findAll();
  }
}
