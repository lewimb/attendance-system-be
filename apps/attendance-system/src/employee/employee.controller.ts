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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
import {
  ApiAuth,
  ApiEnvelope,
  ApiError,
  ApiValidationError,
} from '../common/swagger/decorators.js';
import {
  EmployeeModel,
  EmployeeWithRoleModel,
} from '../common/swagger/models.js';

@ApiTags('employees')
@Controller('employees')
export class EmployeeController {
  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'List employees (HR admin)',
    description:
      'Search by name with `search`, and filter by `departmentId` and `isActive`. Filters combine, so `search=budi&departmentId=5` returns the employees named Budi in department 5.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Max 100',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Part of the full name, case insensitive, for example `budi`. Max 100 characters.',
  })
  @ApiQuery({ name: 'departmentId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, enum: EMPLOYEE_SORT_FIELDS })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiAuth({ hrOnly: true })
  @ApiEnvelope(EmployeeWithRoleModel, {
    paginated: true,
    message: 'Employees retrieved',
  })
  @ApiValidationError('search must be at most 100 characters')
  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Employees retrieved')
  findAllEmployee(
    @Query('search') search: unknown,
    @Query('departmentId', new ParseIntPipe({ optional: true }))
    departmentId: number | undefined,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive: boolean | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('order') order: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (search !== undefined && typeof search !== 'string') {
      throw new BadRequestException('search must be a single string');
    }
    const term = search?.trim() || undefined;
    if (term !== undefined && term.length > 100) {
      throw new BadRequestException('search must be at most 100 characters');
    }

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
      search: term,
      departmentId,
      isActive,
      sortBy,
      order: direction,
      page: Math.max(page, 1),
      limit: Math.min(Math.max(limit, 1), 100),
    };

    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ALL, payload);
  }

  @ApiOperation({ summary: 'Create an employee (HR admin)' })
  @ApiAuth({ hrOnly: true, write: true })
  @ApiEnvelope(EmployeeModel, {
    status: 201,
    message: 'Employee succesfully created',
  })
  @ApiError(409, 'Email already registered or Employee code already exists')
  @ApiValidationError()
  @Post()
  @Role('HR_ADMIN')
  @ResponseMessage('Employee succesfully created')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.CREATE, dto);
  }

  @ApiOperation({ summary: 'Get an employee (HR admin)' })
  @ApiAuth({ hrOnly: true })
  @ApiEnvelope(EmployeeWithRoleModel, { message: 'Employee retrieved' })
  @ApiError(404, 'Employee not found')
  @Get(':id')
  @Role('HR_ADMIN')
  @ResponseMessage('Employee retrieved')
  findEmployeeById(@Param('id', ParseIntPipe) id: number) {
    return sendRpc(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ONE, { id });
  }

  @ApiOperation({
    summary: 'Update an employee (HR admin)',
    description:
      'The employee code and the password cannot be changed. Send only the fields to change.',
  })
  @ApiAuth({ hrOnly: true, write: true })
  @ApiEnvelope(null, { message: 'Employee successfully updated' })
  @ApiError(404, 'Employee not found')
  @ApiError(409, 'Email already registered')
  @ApiValidationError()
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

  @ApiOperation({
    summary: 'Deactivate an employee (HR admin)',
    description:
      'Blocks login and revokes the refresh tokens. Employees are never deleted, so their attendance history stays.',
  })
  @ApiAuth({ hrOnly: true, write: true })
  @ApiEnvelope(null, { message: 'Employee successfully deactivated' })
  @ApiError(404, 'Employee not found')
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
