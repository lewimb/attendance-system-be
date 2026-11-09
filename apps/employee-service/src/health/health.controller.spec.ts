import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = { query: vi.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    dataSource.query.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should report the database as up', async () => {
    dataSource.query.mockResolvedValue([{ 1: 1 }]);

    await expect(controller.check()).resolves.toEqual({ database: 'up' });
  });

  it('should throw an rpc error when the database is down', async () => {
    dataSource.query.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(controller.check()).rejects.toBeInstanceOf(RpcException);
  });
});
