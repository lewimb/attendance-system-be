import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  type FindOptionsWhere,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import type {
  CheckInPayload,
  CheckOutPayload,
  FindAllAttendancePayload,
  FindAttendancePhotoPayload,
  FindMyAttendancePayload,
  Paginated,
} from '@app/common';
import { Attendance } from './attendance.entity.js';

export type AttendanceView = Omit<
  Attendance,
  'checkInPhotoPath' | 'checkInPhotoMime'
>;

@Injectable()
export class AttendanceService {
  private readonly businessTz: string;
  private readonly workStartTime: string;

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    config: ConfigService,
  ) {
    this.businessTz = config.get<string>('BUSINESS_TZ', 'Asia/Jakarta');
    this.workStartTime = config
      .get<string>('WORK_START_TIME', '09:00')
      .padEnd(8, ':00');
  }

  async checkIn({
    employeeId,
    photoPath,
    photoMime,
  }: CheckInPayload): Promise<AttendanceView> {
    const now = new Date();
    const local = this.toBusinessTime(now);

    const attendance = this.attendanceRepository.create({
      employeeId,
      workDate: local.date,
      checkInAt: now,
      checkInPhotoPath: photoPath,
      checkInPhotoMime: photoMime,
      status: local.time > this.workStartTime ? 'LATE' : 'PRESENT',
    });

    try {
      const saved = await this.attendanceRepository.save(attendance);
      return this.toView(saved);
    } catch (err) {
      if (this.isDuplicateEntry(err)) {
        throw new RpcException({
          statusCode: 409,
          code: 'ALREADY_CHECKED_IN',
          message: 'Already checked in today',
        });
      }
      throw err;
    }
  }

  async checkOut({ employeeId }: CheckOutPayload): Promise<AttendanceView> {
    const now = new Date();
    const workDate = this.toBusinessTime(now).date;

    const result = await this.attendanceRepository.update(
      { employeeId, workDate, checkOutAt: IsNull() },
      { checkOutAt: now },
    );

    const attendance = await this.attendanceRepository.findOneBy({
      employeeId,
      workDate,
    });

    if (!attendance) {
      throw new RpcException({
        statusCode: 409,
        code: 'NOT_CHECKED_IN',
        message: 'Not checked in today',
      });
    }

    if (!result.affected) {
      throw new RpcException({
        statusCode: 409,
        code: 'ALREADY_CHECKED_OUT',
        message: 'Already checked out today',
      });
    }

    return this.toView(attendance);
  }

  async findByEmployee({
    employeeId,
    from,
    to,
    page,
    limit,
  }: FindMyAttendancePayload): Promise<Paginated<AttendanceView>> {
    const range = this.resolveRange(from, to);

    const [rows, total] = await this.attendanceRepository.findAndCount({
      where: { employeeId, workDate: Between(range.from, range.to) },
      order: { workDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: rows.map((row) => this.toView(row)), total, page, limit };
  }

  async findAll({
    from,
    to,
    employeeIds,
    status,
    page,
    limit,
  }: FindAllAttendancePayload): Promise<Paginated<AttendanceView>> {
    if (employeeIds?.length === 0) return { items: [], total: 0, page, limit };

    const range = this.resolveRange(from, to);
    const where: FindOptionsWhere<Attendance> = {
      workDate: Between(range.from, range.to),
    };
    if (employeeIds) where.employeeId = In(employeeIds);
    if (status) where.status = status;

    const [rows, total] = await this.attendanceRepository.findAndCount({
      where,
      order: { workDate: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: rows.map((row) => this.toView(row)), total, page, limit };
  }

  async findPhoto({ attendanceId, ownerId }: FindAttendancePhotoPayload) {
    const attendance = await this.attendanceRepository.findOne({
      select: { id: true, checkInPhotoPath: true, checkInPhotoMime: true },

      where: ownerId
        ? { id: attendanceId, employeeId: ownerId }
        : { id: attendanceId },
    });

    if (!attendance) {
      throw new RpcException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Attendance not found',
      });
    }

    return {
      photoPath: attendance.checkInPhotoPath,
      photoMime: attendance.checkInPhotoMime,
    };
  }

  private toBusinessTime(date: Date) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('id-ID', {
        timeZone: this.businessTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(date)
        .map((part) => [part.type, part.value]),
    );

    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}:${parts.second}`,
    };
  }

  private resolveRange(from?: string, to?: string) {
    const [year, month] = this.toBusinessTime(new Date())
      .date.split('-')
      .map(Number);
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return {
      from: from ?? `${year}-${mm}-01`,
      to: to ?? `${year}-${mm}-${lastDay}`,
    };
  }

  private isDuplicateEntry(err: unknown) {
    return (
      err instanceof QueryFailedError &&
      (err.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private toView({
    checkInPhotoPath: _path,
    checkInPhotoMime: _mime,
    ...view
  }: Attendance): AttendanceView {
    return view;
  }
}
