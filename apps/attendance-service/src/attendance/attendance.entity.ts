import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AttendanceStatus } from '@app/common';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'employee_id', type: 'bigint' })
  employeeId: string;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'check_in_at', type: 'datetime' })
  checkInAt: Date;

  @Column({ name: 'check_in_photo_path', length: 255 })
  checkInPhotoPath: string;

  @Column({ name: 'check_in_photo_mime', length: 20 })
  checkInPhotoMime: string;

  @Column({ name: 'check_out_at', type: 'datetime', nullable: true })
  checkOutAt: Date | null;

  @Column({ type: 'varchar', length: 20 })
  status: AttendanceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
