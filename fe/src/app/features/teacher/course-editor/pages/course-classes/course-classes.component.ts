import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClassService } from '../../../../../state/class.service';
import { ClassSummary } from '../../../../../shared/types/course.types';
import { ClassDialogComponent } from './class-dialog/class-dialog.component';
import { Page } from '../../../../../api/types/common.types';
import { AddStudentDrawerComponent } from './class-students/add-student-drawer/add-student-drawer.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-classes',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, AddStudentDrawerComponent],
    templateUrl: './course-classes.component.html',
})
export class CourseClassesComponent implements OnInit {
    private classService = inject(ClassService);
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    courseId = '';
    classes = signal<ClassSummary[]>([]);
    isLoading = signal(true);

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

    ngOnInit() {
        this.generateYears();
        this.route.parent?.params.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(params => {
            this.courseId = params['id'];
            if (this.courseId) {
                this.loadClasses();
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
        this.isLoading.set(true);
        const search = this.searchControl.value || '';

        // Construct semester filter (e.g., "HK1-2024")
        let semesterFilter = '';
        if (this.selectedSemester && this.selectedYear) {
            semesterFilter = `${this.selectedSemester}-${this.selectedYear}`;
        }

        this.classService.searchClasses(
            this.courseId,
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
            data: { mode: 'create', courseId: this.courseId }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadClasses();
        });
    }

    editClass(cls: ClassSummary) {
        const dialogRef = this.dialog.open(ClassDialogComponent, {
            width: '600px',
            data: { mode: 'edit', classData: cls, courseId: this.courseId }
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

        this.classService.deleteClass(classId).subscribe(() => {
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
