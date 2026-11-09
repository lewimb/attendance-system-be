import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { HEALTH_PATTERNS } from '@app/common';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @MessagePattern(HEALTH_PATTERNS.CHECK)
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new RpcException({
        statusCode: 503,
        message: 'Database unavailable',
      });
    }

    return { database: 'up' };
  }
}
