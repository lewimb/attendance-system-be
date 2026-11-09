import { SetMetadata } from '@nestjs/common';

type ROLE = 'HR_ADMIN';

export const EMPLOYEES_ROLE_KEY = 'role';
export const Role = (role: ROLE) => SetMetadata(EMPLOYEES_ROLE_KEY, role);
