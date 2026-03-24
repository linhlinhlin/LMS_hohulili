import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClassService } from '../../../../../state/class.service';
import { ClassSummary } from '../../../../../shared/types/course.types';
import { ClassDialogComponent } from './class-dialog/class-dialog.component';
import { Page } from '../../../../../api/types/common.types';
import { AddStudentDrawerComponent } from './class-students/add-student-drawer/add-student-drawer.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CourseEditorStore } from '../../store/course-editor.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-classes',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, AddStudentDrawerComponent],
    templateUrl: './course-classes.component.html',
    styleUrl: './course-classes.component.scss',
})
export class CourseClassesComponent implements OnInit {
    private classService = inject(ClassService);
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private store = inject(CourseEditorStore);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    courseId = signal('');
    classes = signal<ClassSummary[]>([]);
    isLoading = signal(true);
    private lastLoadedCourseId = '';
    private lastBlockedCourseId = '';

    // Drawer State
    isDrawerOpen = signal(false);
    selectedClassId = signal('');

    // ... (rest of the properties)
    searchControl = new FormControl('');
    statusFilter = '';
    selectedYear: number = new Date().getFullYear();
    selectedSemester: string = '';

    years: number[] = [];
    semesters = ['HK1', 'HK2', 'Hè'];

    // Pagination State
    currentPage = 0;
    pageSize = 10;
    totalElements = 0;
    totalPages = 0;

    get pageInfo() {
        return {
            startRow: this.totalElements === 0 ? 0 : this.currentPage * this.pageSize + 1,
            endRow: Math.min((this.currentPage + 1) * this.pageSize, this.totalElements)
        };
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages - 1;
    }

    constructor() {
        effect(() => {
            const courseId = this.courseId();
            const tree = this.store.courseTree();

            if (!courseId || !tree || tree.id !== courseId) {
                return;
            }

            if (tree.deliveryMode !== 'INSTRUCTOR_LED') {
                this.isLoading.set(false);
                if (this.lastBlockedCourseId === courseId) {
                    return;
                }
                this.lastBlockedCourseId = courseId;
                queueMicrotask(() => {
                    this.toast.warning('Quản lý lớp chỉ áp dụng cho khóa học dạng "Lớp học".');
                    void this.router.navigate(['/teacher/courses', courseId, 'editor', 'info']);
                });
                return;
            }

            this.lastBlockedCourseId = '';
            if (this.lastLoadedCourseId !== courseId) {
                this.lastLoadedCourseId = courseId;
                this.loadClasses();
            }
        });
    }

    ngOnInit() {
        this.generateYears();
        this.route.parent?.params.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(params => {
            const nextCourseId = params['id'] ?? '';
            if (nextCourseId !== this.courseId()) {
                this.lastLoadedCourseId = '';
                this.courseId.set(nextCourseId);
            }
        });

        // Debounce Search
        this.searchControl.valueChanges.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.currentPage = 0; // Reset to first page on search
            this.loadClasses();
        });
    }

    generateYears() {
        const currentYear = new Date().getFullYear();
        this.years = [currentYear - 1, currentYear, currentYear + 1];
    }

    onYearChange(event: any) {
        this.selectedYear = Number(event.target.value);
        this.currentPage = 0;
        this.loadClasses();
    }

    onSemesterChange(event: any) {
        this.selectedSemester = event.target.value;
        this.currentPage = 0;
        this.loadClasses();
    }

    onStatusChange(event: any) {
        this.statusFilter = event.target.value;
        this.currentPage = 0;
        this.loadClasses();
    }

    changePage(newPage: number) {
        if (newPage >= 0 && newPage < this.totalPages) {
            this.currentPage = newPage;
            this.loadClasses();
        }
    }

    loadClasses() {
        const courseId = this.courseId();
        const tree = this.store.courseTree();
        if (!courseId || !tree || tree.id !== courseId || tree.deliveryMode !== 'INSTRUCTOR_LED') {
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        const search = this.searchControl.value || '';

        // Construct semester filter (e.g., "HK1-2024")
        let semesterFilter = '';
        if (this.selectedSemester && this.selectedYear) {
            semesterFilter = `${this.selectedSemester}-${this.selectedYear}`;
        }

        this.classService.searchClasses(
            courseId,
            search,
            this.statusFilter,
            semesterFilter,
            this.currentPage,
            this.pageSize
        ).subscribe({
            next: (page: Page<ClassSummary>) => {
                this.classes.set(page.content);
                this.totalElements = page.totalElements;
                this.totalPages = page.totalPages;
                this.isLoading.set(false);
            },
            error: () => {
                this.toast.error('Không thể tải danh sách lớp học');
                this.isLoading.set(false);
            }
        });
    }

    openCreateDialog() {
        const dialogRef = this.dialog.open(ClassDialogComponent, {
            width: '600px',
            data: { mode: 'create', courseId: this.courseId() }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadClasses();
        });
    }

    editClass(cls: ClassSummary) {
        const dialogRef = this.dialog.open(ClassDialogComponent, {
            width: '600px',
            data: { mode: 'edit', classData: cls, courseId: this.courseId() }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadClasses();
        });
    }

    async deleteClass(classId: string) {
        const confirmed = await this.confirmDialog.confirm({
            title: 'Xóa lớp học',
            message: 'Bạn có chắc chắn muốn xóa lớp này? Học viên sẽ bị hủy đăng ký trong lớp này.',
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });
        if (!confirmed) return;

        this.classService.deleteClass(classId).pipe(
            catchError(() => {
                this.toast.error('Khong the xoa lop hoc. Vui long thu lai.');
                return EMPTY;
            })
        ).subscribe(() => {
            this.loadClasses();
        });
    }

    viewStudents(classId: string) {
        this.router.navigate(['/teacher/classes', classId, 'students']);
    }

    quickEnroll(cls: ClassSummary) {
        this.selectedClassId.set(cls.id);
        this.isDrawerOpen.set(true);
    }
}
