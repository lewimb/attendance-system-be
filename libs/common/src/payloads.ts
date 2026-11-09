export const EMPLOYEE_SORT_FIELDS = [
  'id',
  'employeeCode',
  'fullName',
  'email',
  'createdAt',
] as const;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];
export type SortOrder = 'ASC' | 'DESC';

export type FindAllEmployeesPayload = {
  departmentId?: number;
  isActive?: boolean;
  sortBy?: EmployeeSortField;
  order?: SortOrder;
  page: number;
  limit: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type AttendanceStatus = 'PRESENT' | 'LATE';

export type CheckInPayload = {
  employeeId: string;
  photoPath: string;
  photoMime: 'image/jpeg' | 'image/png';
};

export type CheckOutPayload = {
  employeeId: string;
};

export type FindMyAttendancePayload = {
  employeeId: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type FindAllAttendancePayload = {
  from?: string;
  to?: string;
  employeeIds?: string[];
  status?: AttendanceStatus;
  page: number;
  limit: number;
};

export type FindAttendancePhotoPayload = {
  attendanceId: string;
  ownerId?: string;
};
