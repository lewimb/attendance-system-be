import { ApiProperty } from '@nestjs/swagger';

export class RoleModel {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ enum: ['HR_ADMIN', 'EMPLOYEE'], example: 'EMPLOYEE' })
  roleName: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-06T14:06:37.000Z' })
  createdAt: string;
}

export class EmployeeModel {
  @ApiProperty({ example: '12' })
  id: string;

  @ApiProperty({ example: 'EMP-0012' })
  employeeCode: string;

  @ApiProperty({ example: 'Citra Santoso' })
  fullName: string;

  @ApiProperty({ example: 'employee012@example.com' })
  email: string;

  @ApiProperty({ example: 2 })
  roleId: number;

  @ApiProperty({ example: 3 })
  departmentId: number;

  @ApiProperty({ type: String, nullable: true, example: '081200000012' })
  phone: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ format: 'date-time', example: '2026-11-06T17:00:30.000Z' })
  createdAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-06T17:00:30.000Z' })
  updatedAt: string;
}

export class EmployeeWithRoleModel extends EmployeeModel {
  @ApiProperty({ type: RoleModel })
  role: RoleModel;
}

export class DepartmentModel {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'IT' })
  name: string;
}

export class AttendanceModel {
  @ApiProperty({ example: '123' })
  id: string;

  @ApiProperty({ example: '12' })
  employeeId: string;

  @ApiProperty({
    format: 'date',
    example: '2026-11-10',
    description: 'Work date in BUSINESS_TZ',
  })
  workDate: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-11-10T01:58:12.000Z',
    description: 'UTC, set by the server',
  })
  checkInAt: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
    description: 'UTC, null until check-out',
  })
  checkOutAt: string | null;

  @ApiProperty({
    enum: ['PRESENT', 'LATE'],
    example: 'PRESENT',
    description: 'LATE when the check-in is after WORK_START_TIME',
  })
  status: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-10T01:58:12.000Z' })
  createdAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-10T01:58:12.000Z' })
  updatedAt: string;
}

export class EmployeeSummaryModel {
  @ApiProperty({ example: '12' })
  id: string;

  @ApiProperty({ example: 'EMP-0012' })
  employeeCode: string;

  @ApiProperty({ example: 'Citra Santoso' })
  fullName: string;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  departmentId: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'QA' })
  departmentName: string | null;
}

export class HrAttendanceModel extends AttendanceModel {
  @ApiProperty({
    type: EmployeeSummaryModel,
    nullable: true,
    description: 'null when the employee no longer exists',
  })
  employee: EmployeeSummaryModel | null;
}

export class LoginResponseModel {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Also set as the accessToken cookie. Send it as a Bearer token from API clients.',
  })
  accessToken: string;
}

export class HealthModel {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      database: { status: 'up', responseTime: 3 },
      employee_service: { status: 'up', database: 'up', responseTime: 4 },
      attendance_service: { status: 'up', database: 'up', responseTime: 4 },
    },
  })
  info: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  error: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      database: { status: 'up', responseTime: 3 },
      employee_service: { status: 'up', database: 'up', responseTime: 4 },
      attendance_service: { status: 'up', database: 'up', responseTime: 4 },
    },
  })
  details: Record<string, unknown>;
}
