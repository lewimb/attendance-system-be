import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateEmployeeDto,
  EMPLOYEE_PATTERNS,
  type FindAllEmployeesPayload,
  type UpdateEmployeePayload,
} from '@app/common';
import { EmployeeService } from './employee.service.js';

@Controller()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: FindAllEmployeesPayload) {
    return this.employeeService.findAll(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: { id: number }) {
    return this.employeeService.findOneById(payload.id);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.CREATE)
  create(@Payload() payload: CreateEmployeeDto) {
    return this.employeeService.create(payload);
  }
  @MessagePattern(EMPLOYEE_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateEmployeePayload) {
    return this.employeeService.update(payload);
  }
}
