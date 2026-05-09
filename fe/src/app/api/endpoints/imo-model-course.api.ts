import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { map } from 'rxjs/operators';

export interface ImoModelCourse {
  id: number;
  code: string;
  title: string;
  category: string;
}

export interface ImoModelCoursesResponse {
  data: ImoModelCourse[];
  grouped: Record<string, ImoModelCourse[]>;
}

@Injectable({ providedIn: 'root' })
export class ImoModelCourseApi {
  private readonly apiClient = inject(ApiClient);

  getImoModelCourses() {
    return this.apiClient
      .get<{ success: boolean; data: ImoModelCoursesResponse }>('/api/v3/imo-model-courses')
      .pipe(map((res: any) => (res?.data ?? res) as ImoModelCoursesResponse));
  }
}
