import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClassService } from '../../../../../state/class.service';
import { ClassSummary } from '../../../../../shared/types/course.types';
import { ClassDialogComponent } from './class-dialog/class-dialog.component';
import { Page } from '../../../../../api/types/common.types';
import { AddStudentDialogComponent } from './class-students/add-student-dialog/add-student-dialog.component';

@Component({
    selector: 'app-course-classes',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './course-classes.component.html',
})
export class CourseClassesComponent implements OnInit {
    private classService = inject(ClassService);
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private router = inject(Router);

    courseId = '';
    classes = signal<ClassSummary[]>([]);
    isLoading = signal(true);

    // Filter Controls
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
        this.route.parent?.params.subscribe(params => {
            this.courseId = params['id'];
            if (this.courseId) {
                this.loadClasses();
            }
        });

        // Debounce Search
        this.searchControl.valueChanges.pipe(
            debounceTime(400),
            distinctUntilChanged()
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
            error: (err: any) => {
                console.error('Error loading classes', err);
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

    deleteClass(classId: string) {
        if (confirm('Bạn có chắc chắn muốn xóa lớp này? Học viên sẽ bị hủy đăng ký trong lớp này.')) {
            this.classService.deleteClass(classId).subscribe(() => {
                this.loadClasses();
            });
        }
    }

    viewStudents(classId: string) {
        this.router.navigate(['/teacher/classes', classId, 'students']);
    }

    quickEnroll(cls: ClassSummary) {
        const dialogRef = this.dialog.open(AddStudentDialogComponent, {
            width: '500px',
            data: { classId: cls.id }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadClasses();
        });
    }
}
