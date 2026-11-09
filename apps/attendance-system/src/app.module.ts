import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform/transform.interceptor.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module.js';
import { ConfigModule } from '@nestjs/config';
import { AttendanceModule } from './attendance/attendance.module.js';
import { DepartmentModule } from './department/department.module.js';
import { HealthModule } from './health/health.module.js';
import { validateEnv } from './config/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 10000, limit: 5 }]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    EmployeeModule,
    AttendanceModule,
    DepartmentModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_PIPE,

      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
