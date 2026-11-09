import { Test, TestingModule } from '@nestjs/testing';
import { EMPLOYEE_SERVICE } from '@app/common';
import { DepartmentController } from './department.controller.js';

describe('DepartmentController', () => {
  let controller: DepartmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [{ provide: EMPLOYEE_SERVICE, useValue: { send: vi.fn() } }],
    }).compile();

    controller = module.get<DepartmentController>(DepartmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
