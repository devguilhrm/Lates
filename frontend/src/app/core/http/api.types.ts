export interface ApiEnvelope<T> {
  data: T;
  meta?: PageMeta;
  message?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}
