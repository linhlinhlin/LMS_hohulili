export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
  timestamp: string;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  first: boolean;
  last: boolean;
}