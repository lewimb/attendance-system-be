import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateEmployeeDto,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  EMPLOYEE_SORT_FIELDS,
  type EmployeeSortField,
  type FindAllEmployeesPayload,
  UpdateEmployeeDto,
  type UpdateEmployeePayload,
} from '@app/common';
import { Role } from '../common/decorators/role.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('employees')
export class EmployeeController {
  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Employees retrieved')
  findAllEmployee(
    @Query('departmentId', new ParseIntPipe({ optional: true }))
    departmentId: number | undefined,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive: boolean | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('order') order: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (sortBy !== undefined && !this.isSortField(sortBy)) {
      throw new BadRequestException(
        `sortBy must be one of: ${EMPLOYEE_SORT_FIELDS.join(', ')}`,
      );
    }

    const direction = order?.toUpperCase();
    if (
      direction !== undefined &&
      direction !== 'ASC' &&
      direction !== 'DESC'
    ) {
      throw new BadRequestException('order must be asc or desc');
    }

    const payload: FindAllEmployeesPayload = {
      departmentId,
      isActive,
      sortBy,
      order: direction,
      page: Math.max(page, 1),
      limit: Math.min(Math.max(limit, 1), 100),
    };

    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ALL, payload);
  }

  @Post()
  @Role('HR_ADMIN')
  @ResponseMessage('Employee succesfully created')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.CREATE, dto);
  }

  @Get(':id')
  @Role('HR_ADMIN')
  @ResponseMessage('Employee retrieved')
  findEmployeeById(@Param('id', ParseIntPipe) id: number) {
    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ONE, { id });
  }

  @Patch(':id')
  @Role('HR_ADMIN')
  @ResponseMessage('Employee successfully updated')
  updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const payload: UpdateEmployeePayload = { ...dto, id };

    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.UPDATE, payload);
  }

  @Patch(':id/deactivate')
  @Role('HR_ADMIN')
  @ResponseMessage('Employee successfully deactivated')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    await sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.DEACTIVATE, { id });
    await this.authService.revokedRefreshTokenById(id);
  }

  private isSortField(value: string): value is EmployeeSortField {
    return (EMPLOYEE_SORT_FIELDS as readonly string[]).includes(value);
  }
}
