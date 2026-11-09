import { Test, TestingModule } from '@nestjs/testing';
import { ATTENDANCE_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { AttendanceController } from './attendance.controller.js';
import { PhotoStorageService } from './photo-storage.service.js';

describe('AttendanceController', () => {
  let controller: AttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        { provide: ATTENDANCE_SERVICE, useValue: { send: vi.fn() } },
        { provide: EMPLOYEE_SERVICE, useValue: { send: vi.fn() } },
        { provide: PhotoStorageService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
