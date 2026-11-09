import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    example: 'EMP-0101',
    minLength: 1,
    maxLength: 20,
    description: 'Cannot be changed after creation',
  })
  @IsString()
  @Length(1, 20)
  employeeCode: string;

  @ApiProperty({ example: 'Rina Kartika', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  fullName: string;

  @ApiProperty({
    example: 'rina.kartika@example.com',
    description: 'Stored trimmed and lowercased',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 2,
    description: 'In the seed data, 1 = HR_ADMIN and 2 = EMPLOYEE',
  })
  @IsInt()
  roleId: number;

  @ApiProperty({ example: 5, description: 'An id from GET /departments' })
  @IsInt()
  departmentId: number;

  @ApiPropertyOptional({ example: '081234567890', minLength: 1, maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;
}

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['password', 'employeeCode'] as const),
) {}

export type UpdateEmployeePayload = UpdateEmployeeDto & { id: number };
