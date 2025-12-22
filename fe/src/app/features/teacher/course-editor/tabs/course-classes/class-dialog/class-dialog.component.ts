import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, startWith, map, catchError } from 'rxjs/operators';

import { ClassService } from '../../../../../../state/class.service';
import { UserService, UserSummary } from '../../../../../../core/services/user.service';
import { ClassSummary } from '../../../../../../shared/types/course.types';

@Component({
    selector: 'app-class-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatAutocompleteModule,
        MatInputModule
    ],
    templateUrl: './class-dialog.component.html',
})
export class ClassDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<ClassDialogComponent>);
    public classService = inject(ClassService);
    private userService = inject(UserService);

    // Data: { mode: 'create' | 'edit', classData?: ClassSummary, courseId: string }
    data = inject(MAT_DIALOG_DATA) as { mode: 'create' | 'edit', classData?: ClassSummary, courseId: string };

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        scheduleType: ['SEMESTER', Validators.required],
        semesterIndex: ['1'],
        year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        maxStudents: [50, [Validators.required, Validators.min(1)]],
        teacherId: [null] // Store selected teacher ID
    });

    // Teacher Autocomplete Controls
    teacherSearchControl = new FormControl('');
    filteredTeachers!: Observable<UserSummary[]>;

    // Helper to display current teacher name if in edit mode (not strictly needed if autocomplete works, but good for UX)
    // We can just set teacherSearchControl value to the name.

    ngOnInit() {
        // Setup Teacher Search
        this.filteredTeachers = this.teacherSearchControl.valueChanges.pipe(
            startWith(''),
            debounceTime(300),
            switchMap(value => {
                const query = typeof value === 'string' ? value : (value as any)?.fullName;
                if (!query && typeof value === 'string' && value === '') {
                    // Empty query, maybe don't search? or search all?
                    // Let's search all (or recent) if empty, or just return empty.
                    // User requested "don't load entire list", so maybe empty if query is empty?
                    // Or maybe search with empty string returns top 10?
                    return this.userService.searchUsersByRole('TEACHER', '', 0, 10).pipe(
                        map(page => page.content),
                        catchError(() => of([]))
                    );
                }
                if (typeof value !== 'string') return of([]); // It's an object selection

                return this.userService.searchUsersByRole('TEACHER', query, 0, 10).pipe(
                    map(page => page.content),
                    catchError(() => of([]))
                );
            })
        );

        if (this.data.mode === 'edit' && this.data.classData) {
            const cls = this.data.classData;

            // Parse Semester String if exists (Format: HKx-YYYY)
            let semIdx = '1';
            let semYear = new Date().getFullYear();
            if (cls.semester && cls.semester.includes('-')) {
                const parts = cls.semester.split('-');
                if (parts.length === 2 && parts[0].startsWith('HK')) {
                    semIdx = parts[0].replace('HK', '');
                    semYear = parseInt(parts[1]);
                }
            }

            this.form.patchValue({
                name: cls.name,
                scheduleType: cls.scheduleType,
                semesterIndex: semIdx,
                year: semYear,
                startDate: cls.startDate ? cls.startDate.split('T')[0] : '',
                endDate: cls.endDate ? cls.endDate.split('T')[0] : '',
                maxStudents: cls.maxStudents,
                // teacherId: cls.teacherId // Backend summary might not have teacherId yet, only teacherName?
                // ClassSummary has teacherName, but maybe not ID. 
                // Creating a class sets teacher. Updating might not allow changing teacher easily if ID is missing.
                // Assuming we don't change teacher effectively in edit mode unless we have ID.
                // Let's assume ClassSummary DOES NOT have teacherId in current interface.
                // If user wants to change teacher, they search. 
                // But display current teacher name?
            });

            // Set initial display for teacher
            if (cls.teacherName) {
                this.teacherSearchControl.setValue({ fullName: cls.teacherName } as any); // Hack to display name
                // If we had teacherId in ClassSummary, we would set it in form.
                // Since we don't, checking... Repository `searchClasses` returns `LearningClass`.
                // MapToSummary implementation in Controller:
                // dto.setTeacherName(entity.getTeacher().getFullName());
                // It does NOT set teacherId.
                // So in Edit Mode, we cannot easily preset the correct teacher ID to keep it if unchanged.
                // However, the UpdateClassRequest doesn't support changing teacherId currently? 
                // My `updateClass` method in `ClassService` calls `classRepository.save`.
                // `UpdateClassRequest` DTO does NOT have teacherId.
                // So currently Feature Request only asked for "Modify the class creation form". 
                // "Modify the class creation form to include...". 
                // It didn't explicitly say "Edit form". 
                // I will add it for creation. For Edit, maybe just separate or ignored for now as API doesn't support update teacher.
            }
        }

        // Validate conditional logic for Semester
        this.form.get('scheduleType')?.valueChanges.subscribe(val => {
            const semesterIndexCtrl = this.form.get('semesterIndex');
            const yearCtrl = this.form.get('year');

            if (val === 'SEMESTER') {
                semesterIndexCtrl?.setValidators([Validators.required]);
                yearCtrl?.setValidators([Validators.required, Validators.min(2000)]);
            } else {
                semesterIndexCtrl?.clearValidators();
                semesterIndexCtrl?.setValue('');
                yearCtrl?.clearValidators();
                yearCtrl?.setValue('');
            }
            semesterIndexCtrl?.updateValueAndValidity();
            yearCtrl?.updateValueAndValidity();
        });
    }

    displayTeacherFn(user: UserSummary | string): string {
        if (typeof user === 'string') return user;
        return user ? user.fullName + (user.email ? ` (${user.email})` : '') : '';
    }

    onTeacherSelected(event: any) {
        const user: UserSummary = event.option.value;
        this.form.patchValue({ teacherId: user.id });
    }

    save() {
        if (this.form.invalid) return;

        const rawVal = this.form.value;

        // Construct semester string
        let semesterStr = '';
        if (rawVal.scheduleType === 'SEMESTER') {
            semesterStr = `HK${rawVal.semesterIndex}-${rawVal.year}`;
        }

        const payload: any = {
            name: rawVal.name,
            scheduleType: rawVal.scheduleType,
            semester: semesterStr,
            maxStudents: rawVal.maxStudents,
            startDate: new Date(rawVal.startDate).toISOString(),
            endDate: new Date(rawVal.endDate).toISOString(),
            courseId: this.data.courseId
        };

        // Add teacherId if present (mostly for create)
        if (rawVal.teacherId) {
            payload.teacherId = rawVal.teacherId;
        }

        if (this.data.mode === 'create') {
            this.classService.createClass(payload).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err: any) => console.error(err)
            });
        } else if (this.data.mode === 'edit' && this.data.classData) {
            this.classService.updateClass(this.data.classData.id, payload).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err: any) => console.error(err)
            });
        }
    }

    close() {
        this.dialogRef.close();
    }
}

