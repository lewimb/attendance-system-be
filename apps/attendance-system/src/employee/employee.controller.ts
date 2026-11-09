import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type FindAllEmployeesPayload,
} from '@app/common';
import { Role } from '../common/decorators/role.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';

@Controller('employee')
export class EmployeeController {
  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Employees retrieved')
  findAllEmployee(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const payload: FindAllEmployeesPayload = {
      page: Math.max(page, 1),
      limit: Math.min(Math.max(limit, 1), 100),
    };

    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ALL, payload);
  }

  @Get(':id')
  @Role('HR_ADMIN')
  @ResponseMessage('Employee retrieved')
  findEmployeeById(@Param('id', ParseIntPipe) id: number) {
    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ONE, { id });
  }
}
