export type FindAllEmployeesPayload = {
  page: number;
  limit: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
