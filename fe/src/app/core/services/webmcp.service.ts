import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * WebMCP Service — Exposes LMS Maritime tools to AI agents via the Web Model Context Protocol.
 *
 * Spec: https://github.com/webmachinelearning/webmcp
 * Status: W3C Draft (Feb 2026), Chrome 146+ Canary behind flag
 *
 * Only registers tools when navigator.modelContext is available.
 * All tools expose PUBLIC data only — no auth required.
 */
@Injectable({ providedIn: 'root' })
export class WebMcpService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const nav = navigator as any;
    if (!nav.modelContext?.registerTool) return;

    this.registerSearchCourses(nav);
    this.registerGetCourseDetail(nav);
    this.registerGetCourseCurriculum(nav);
    this.registerListCategories(nav);
  }

  private registerSearchCourses(nav: any): void {
    nav.modelContext.registerTool({
      name: 'search_courses',
      description: 'Tìm kiếm khóa học hàng hải trên LMS Maritime. Trả về danh sách khóa học phù hợp với từ khóa, danh mục, hoặc cấp độ.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Từ khóa tìm kiếm (tên khóa học, mô tả, giảng viên)'
          },
          category: {
            type: 'string',
            description: 'Danh mục: navigation, engineering, logistics, law, certificates, safety',
            enum: ['navigation', 'engineering', 'logistics', 'law', 'certificates', 'safety']
          },
          level: {
            type: 'string',
            description: 'Cấp độ khóa học',
            enum: ['beginner', 'intermediate', 'advanced']
          },
          page: {
            type: 'number',
            description: 'Số trang (bắt đầu từ 0)'
          }
        }
      },
      execute: async (params: any) => {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.set('search', params.query);
        if (params.category) queryParams.set('category', params.category);
        if (params.level) queryParams.set('level', params.level);
        queryParams.set('page', String(params.page ?? 0));
        queryParams.set('size', '12');

        const url = `/api/v3/courses?${queryParams.toString()}`;
        const res: any = await firstValueFrom(this.http.get(url));
        const courses = (res?.data?.content ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.shortDescription || c.description,
          level: c.level,
          price: c.price,
          rating: c.rating,
          teacher: c.teacherName,
          thumbnail: c.thumbnail,
          category: c.categoryName,
          url: `${location.origin}/courses/${c.id}`
        }));

        return {
          courses,
          total: res?.data?.totalElements ?? courses.length,
          page: res?.data?.number ?? 0,
          totalPages: res?.data?.totalPages ?? 1
        };
      }
    });
  }

  private registerGetCourseDetail(nav: any): void {
    nav.modelContext.registerTool({
      name: 'get_course_detail',
      description: 'Lấy thông tin chi tiết của một khóa học: mô tả, giảng viên, giá, đánh giá, yêu cầu đầu vào.',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'ID của khóa học (UUID)'
          }
        },
        required: ['courseId']
      },
      execute: async (params: any) => {
        const res: any = await firstValueFrom(
          this.http.get(`/api/v3/courses/${params.courseId}`)
        );
        const c = res?.data;
        if (!c) return { error: 'Không tìm thấy khóa học' };

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          shortDescription: c.shortDescription,
          level: c.level,
          price: c.price,
          salePrice: c.salePrice,
          rating: c.rating,
          reviewCount: c.reviewCount,
          teacher: { name: c.teacherName, bio: c.teacherBio },
          category: c.categoryName,
          tags: c.tags,
          requirements: c.requirements,
          objectives: c.objectives,
          deliveryMode: c.deliveryMode,
          enrolledCount: c.enrolledCount,
          url: `${location.origin}/courses/${c.id}`
        };
      }
    });
  }

  private registerGetCourseCurriculum(nav: any): void {
    nav.modelContext.registerTool({
      name: 'get_course_curriculum',
      description: 'Lấy danh sách chương và bài học của một khóa học.',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'ID của khóa học (UUID)'
          }
        },
        required: ['courseId']
      },
      execute: async (params: any) => {
        const res: any = await firstValueFrom(
          this.http.get(`/api/v3/courses/${params.courseId}/content`)
        );
        const chapters = (res?.data ?? []).map((ch: any) => ({
          title: ch.title,
          order: ch.orderIndex,
          lessons: (ch.lessons ?? []).map((l: any) => ({
            title: l.title,
            type: l.type,
            duration: l.duration,
            order: l.orderIndex
          }))
        }));

        return { courseId: params.courseId, chapters };
      }
    });
  }

  private registerListCategories(nav: any): void {
    nav.modelContext.registerTool({
      name: 'list_categories',
      description: 'Liệt kê tất cả danh mục khóa học có trên LMS Maritime.',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        return {
          categories: [
            { id: 'navigation', name: 'Điều khiển tàu biển', url: `${location.origin}/courses/navigation` },
            { id: 'engineering', name: 'Kỹ thuật hàng hải', url: `${location.origin}/courses/engineering` },
            { id: 'logistics', name: 'Logistics & Vận tải biển', url: `${location.origin}/courses/logistics` },
            { id: 'law', name: 'Luật hàng hải', url: `${location.origin}/courses/law` },
            { id: 'certificates', name: 'Chứng chỉ nghề', url: `${location.origin}/courses/certificates` },
            { id: 'safety', name: 'An toàn hàng hải', url: `${location.origin}/courses/safety` }
          ]
        };
      }
    });
  }
}
