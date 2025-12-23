import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ClassService } from '../../../../../../state/class.service';
import { AddStudentDrawerComponent } from './add-student-drawer/add-student-drawer.component';

@Component({
    selector: 'app-class-students',
    standalone: true,
    imports: [CommonModule, AddStudentDrawerComponent],
    templateUrl: './class-students.component.html'
})
export class ClassStudentsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    public router = inject(Router);
    private classService = inject(ClassService);

    classId = '';
    students = signal<any[]>([]);
    isDrawerOpen = signal(false);

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.classId = params['classId'];
            if (this.classId) {
                this.loadStudents();
            }
        });
    }

    loadStudents() {
        this.classService.getClassStudents(this.classId).subscribe(data => {
            this.students.set(data);
        });
    }

    goBack() {
        window.history.back();
    }

    openAddStudentDialog() {
        this.isDrawerOpen.set(true);
    }
}
