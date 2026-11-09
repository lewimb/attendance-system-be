import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity.js';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: string;

  @Column({ name: 'name', length: 30, unique: true })
  roleName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Employee, (employee) => employee.role)
  employees: Employee[];
}
