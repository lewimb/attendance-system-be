import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ATTENDANCE_PATTERNS,
  type CheckInPayload,
  type CheckOutPayload,
  type FindAllAttendancePayload,
  type FindAttendancePhotoPayload,
  type FindMyAttendancePayload,
} from '@app/common';
import { AttendanceService } from './attendance.service.js';

@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @MessagePattern(ATTENDANCE_PATTERNS.CHECK_IN)
  checkIn(@Payload() payload: CheckInPayload) {
    return this.attendanceService.checkIn(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.CHECK_OUT)
  checkOut(@Payload() payload: CheckOutPayload) {
    return this.attendanceService.checkOut(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_BY_EMPLOYEE)
  findByEmployee(@Payload() payload: FindMyAttendancePayload) {
    return this.attendanceService.findByEmployee(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: FindAllAttendancePayload) {
    return this.attendanceService.findAll(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_PHOTO)
  findPhoto(@Payload() payload: FindAttendancePhotoPayload) {
    return this.attendanceService.findPhoto(payload);
  }
}
