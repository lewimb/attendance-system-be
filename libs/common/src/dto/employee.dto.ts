import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Length(1, 20)
  employeeCode: string;

  @IsString()
  @Length(1, 100)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsInt()
  roleId: number;

  @IsInt()
  departmentId: number;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;
}

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['password', 'employeeCode'] as const),
) {}

export type UpdateEmployeePayload = UpdateEmployeeDto & { id: number };
