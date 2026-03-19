import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    computed,
    OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS } from '../../../../api/endpoints/admin.endpoints';
import { COURSE_ENDPOINTS } from '../../../../api/endpoints/course.endpoints';
import { map } from 'rxjs/operators';

/** Minimal shape for course card in View 1 */
export interface CourseUserSummary {
    id: string;
    title: string;
    code?: string;
    status?: string;
    thumbnailUrl?: string;
    enrolledCount?: number;
    teacherCount?: number;
    teacherName?: string;
    instructors?: UserRow[];
}

/** A generic user row used for both teachers and students */
export interface UserRow {
    id: string;
    fullName: string;
    email: string;
    status?: string;
    progressPercentage?: number;
    enrolledAt?: string;
}

@Component({
    selector: 'app-course-users',
    imports: [CommonModule, FormsModule],
    templateUrl: './course-users.component.html',
    styleUrls: ['./course-users.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseUsersComponent implements OnInit {
    private api = inject(ApiClient);

    // ── View 1 state ──
    courses = signal<CourseUserSummary[]>([]);
    loading = signal(false);
    error = signal('');
    searchKw = signal('');
    statusFilter = signal<'' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'PUBLISHED'>('');

    filteredCourses = computed(() => {
        const kw = this.searchKw().trim().toLowerCase();
        const st = this.statusFilter();
        return this.courses().filter(c => {
            const matchKw = !kw ||
                c.title.toLowerCase().includes(kw) ||
                (c.code || '').toLowerCase().includes(kw);
            const matchSt = !st ||
                c.status === st ||
                (st === 'APPROVED' && c.status === 'PUBLISHED');
            return matchKw && matchSt;
        });
    });

    // ── View 2 state ──
    selectedCourse = signal<CourseUserSummary | null>(null);
    activeTab = signal<'teachers' | 'students'>('teachers');
    detailLoading = signal(false);
    teachers = signal<UserRow[]>([]);
    students = signal<UserRow[]>([]);
    userSearchKw = signal('');

    filteredUsers = computed(() => {
        const kw = this.userSearchKw().trim().toLowerCase();
        const list = this.activeTab() === 'teachers' ? this.teachers() : this.students();
        if (!kw) return list;
        return list.filter(u =>
            u.fullName.toLowerCase().includes(kw) ||
            u.email.toLowerCase().includes(kw)
        );
    });

    ngOnInit(): void {
        this.loadCourses();
    }

    loadCourses(): void {
        this.loading.set(true);
        this.error.set('');
        this.api
            .getWithResponse<any>(ADMIN_ENDPOINTS.ALL_COURSES, { params: { page: 0, size: 200 } })
            .pipe(
                map((res: any) => {
                    // Backend may return Spring Page {content:[...]} or flat array
                    const raw: any[] = Array.isArray(res?.data)
                        ? res.data
                        : res?.data?.content ?? [];
                    return raw.map((c: any): CourseUserSummary => ({
                        id: c.id,
                        title: c.title,
                        code: c.code,
                        status: c.status,
                        thumbnailUrl: c.thumbnailUrl ?? c.thumbnail,
                        enrolledCount: c.enrolledCount ?? c.studentsCount ?? 0,
                        teacherCount: c.teacherCount ?? (c.instructors?.length ?? (c.teacherName ? 1 : undefined)),
                        teacherName: c.teacherName,
                        instructors: c.instructors
                    }));
                })
            )
            .subscribe({
                next: (list) => {
                    this.courses.set(list);
                    this.loading.set(false);
                },
                error: () => {
                    this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
                    this.loading.set(false);
                }
            });
    }

    selectCourse(course: CourseUserSummary): void {
        this.selectedCourse.set(course);
        this.activeTab.set('teachers');
        this.userSearchKw.set('');
        this.teachers.set([]);
        this.students.set([]);
        this.loadCourseUsers(course.id);
    }

    backToCourses(): void {
        this.selectedCourse.set(null);
        this.teachers.set([]);
        this.students.set([]);
        this.userSearchKw.set('');
    }

    private loadCourseUsers(courseId: string): void {
        this.detailLoading.set(true);

        // Load course detail first (to get teachers / instructors)
        this.api
            .getWithResponse<any>(ADMIN_ENDPOINTS.COURSE_BY_ID(courseId))
            .subscribe({
                next: (res: any) => {
                    const detail = res?.data ?? res;
                    // Build teacher rows
                    const teacherRows: UserRow[] = [];
                    if (detail?.instructors?.length) {
                        detail.instructors.forEach((ins: any) => {
                            teacherRows.push({
                                id: ins.id ?? ins.userId ?? '',
                                fullName: ins.fullName ?? ins.name ?? ins.teacherName ?? 'GV',
                                email: ins.email ?? ''
                            });
                        });
                    } else if (detail?.teacherName || detail?.teacherId) {
                        teacherRows.push({
                            id: detail.teacherId ?? '',
                            fullName: detail.teacherName ?? 'Giảng viên',
                            email: detail.teacherEmail ?? ''
                        });
                    }
                    this.teachers.set(teacherRows);
                },
                error: () => {
                    // Fallback: no teacher info
                    this.teachers.set([]);
                }
            });

        // Load students
        this.api
            .getWithResponse<any>(
                COURSE_ENDPOINTS.TEACHER.ENROLLED_STUDENTS(courseId),
                { params: { page: 0, size: 500 } }
            )
            .pipe(
                map((res: any) => {
                    const raw: any[] = Array.isArray(res?.data)
                        ? res.data
                        : res?.data?.content ?? [];
                    return raw.map((s: any): UserRow => ({
                        id: s.id ?? s.studentId,
                        fullName: s.fullName ?? s.name ?? '',
                        email: s.email ?? '',
                        status: s.status ?? 'active',
                        progressPercentage: s.progressPercentage ?? 0,
                        enrolledAt: s.enrolledAt
                    }));
                })
            )
            .subscribe({
                next: (list) => {
                    this.students.set(list);
                    this.detailLoading.set(false);
                },
                error: () => {
                    this.students.set([]);
                    this.detailLoading.set(false);
                }
            });
    }

    clearFilters(): void {
        this.searchKw.set('');
        this.statusFilter.set('');
    }

    getStatusLabel(status?: string): string {
        const map: Record<string, string> = {
            PUBLISHED: 'Xuất bản',
            APPROVED: 'Duyệt',
            PENDING: 'Chờ',
            DRAFT: 'Nháp',
            REJECTED: 'Từ chối',
            ARCHIVED: 'Lưu trữ'
        };
        return map[status ?? ''] ?? status ?? '—';
    }

    getEnrollLabel(status?: string): string {
        const map: Record<string, string> = {
            active: 'Đang học',
            inactive: 'Không HĐ',
            suspended: 'Tạm khóa',
            completed: 'Hoàn thành'
        };
        return map[status ?? ''] ?? status ?? '—';
    }

    getInitial(name: string): string {
        return (name ?? '?').trim().charAt(0).toUpperCase();
    }

    onThumbError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.style.display = 'none';
    }
}
