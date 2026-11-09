import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DEPARTMENT_PATTERNS, EMPLOYEE_SERVICE } from '@app/common';
import { Role } from '../common/decorators/role.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';

@Controller('departments')
export class DepartmentController {
  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Departments retrieved')
  findAll() {
    return sendRpc(this.employeeClient, DEPARTMENT_PATTERNS.FIND_ALL, {});
  }
}
