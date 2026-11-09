export const EMPLOYEE_PATTERNS = {
  FIND_ALL: 'employee.find_all',
  FIND_ONE: 'employee.find_one',
  CREATE: 'employee.create',
  UPDATE: 'employee.update',
  DEACTIVATE: 'employee.deactivate',
  FIND_IDS_BY_DEPARTMENT: 'employee.find_ids_by_department',
  FIND_BY_IDS: 'employee.find_by_ids',
} as const;

export const DEPARTMENT_PATTERNS = {
  FIND_ALL: 'department.find_all',
} as const;

export const ATTENDANCE_PATTERNS = {
  CHECK_IN: 'attendance.check_in',
  CHECK_OUT: 'attendance.check_out',
  FIND_BY_EMPLOYEE: 'attendance.find_by_employee',
  FIND_ALL: 'attendance.find_all',
  FIND_PHOTO: 'attendance.find_photo',
} as const;

export const HEALTH_PATTERNS = {
  CHECK: 'health.check',
} as const;
