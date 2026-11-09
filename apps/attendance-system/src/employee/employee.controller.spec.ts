import { Test, TestingModule } from '@nestjs/testing';
import { EMPLOYEE_SERVICE } from '@app/common';
import { EmployeeController } from './employee.controller.js';
import { AuthService } from '../auth/auth.service.js';

describe('EmployeeController', () => {
  let controller: EmployeeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: EMPLOYEE_SERVICE, useValue: { send: vi.fn() } },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
