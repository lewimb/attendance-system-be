import { Test, TestingModule } from '@nestjs/testing';
import { EMPLOYEE_SERVICE } from '@app/common';
import { EmployeeController } from './employee.controller.js';

describe('EmployeeController', () => {
  let controller: EmployeeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [{ provide: EMPLOYEE_SERVICE, useValue: { send: vi.fn() } }],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
