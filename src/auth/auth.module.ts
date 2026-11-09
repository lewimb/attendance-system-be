import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Employee } from '../employee/employee.entity.js';
import { RefreshToken } from './refresh-token.entity.js';
import { Role } from '../employee/role.entity.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard.js';
import { RoleGuard } from './guards/role/role.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, RefreshToken, Role]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AuthModule {}
