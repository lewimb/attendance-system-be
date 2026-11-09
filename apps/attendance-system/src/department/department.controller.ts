import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DEPARTMENT_PATTERNS, EMPLOYEE_SERVICE } from '@app/common';
import { Role } from '../common/decorators/role.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';
import { ApiAuth, ApiEnvelope } from '../common/swagger/decorators.js';
import { DepartmentModel } from '../common/swagger/models.js';

@ApiTags('departments')
@Controller('departments')
export class DepartmentController {
  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  @ApiOperation({
    summary: 'List departments for the employee form (HR admin)',
  })
  @ApiAuth({ hrOnly: true })
  @ApiEnvelope(DepartmentModel, {
    isArray: true,
    message: 'Departments retrieved',
  })
  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Departments retrieved')
  findAll() {
    return sendRpc(this.employeeClient, DEPARTMENT_PATTERNS.FIND_ALL, {});
  }
}
