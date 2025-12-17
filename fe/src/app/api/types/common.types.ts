export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
  timestamp: string;
}

// Spring Data Page
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  first: boolean;
  last: boolean;
}