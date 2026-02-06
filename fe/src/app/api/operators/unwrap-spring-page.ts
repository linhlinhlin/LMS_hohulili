import { map, OperatorFunction, pipe } from 'rxjs';
import { ApiResponse } from '../types/common.types';

/**
 * RxJS operator to unwrap Spring Data Page responses into flat arrays.
 *
 * Transforms `ApiResponse<Page<T>>` → `ApiResponse<T[]>`
 * by extracting `data.content` and preserving pagination metadata.
 *
 * @example
 * ```typescript
 * return this.api.getWithResponse<any>(endpoint, { params }).pipe(
 *   unwrapSpringPage<CourseSummary>()
 * );
 * ```
 */
export function unwrapSpringPage<T>(): OperatorFunction<ApiResponse<any>, ApiResponse<T[]>> {
  return pipe(
    map((res: ApiResponse<any>) => ({
      success: res?.success,
      message: res?.message,
      data: (res?.data?.content ?? []) as T[],
      pagination: res?.pagination,
      timestamp: res?.timestamp
    } as ApiResponse<T[]>))
  );
}
