import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CourseAuthoringService } from './services/course-authoring.service';
import { CourseEditorStore } from './store/course-editor.store';

const instructorLedClassesGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const store = inject(CourseEditorStore);
    const authoringService = inject(CourseAuthoringService);
    const courseId = route.parent?.paramMap.get('id') || route.paramMap.get('id');

    if (!courseId) {
        return router.createUrlTree(['/teacher/courses']);
    }

    const currentTree = store.courseTree();
    if (currentTree?.id === courseId) {
        return currentTree.deliveryMode === 'INSTRUCTOR_LED'
            ? true
            : router.createUrlTree(['/teacher/courses', courseId, 'editor', 'info']);
    }

    return authoringService.getCourseDraft(courseId).pipe(
        map(tree => tree.deliveryMode === 'INSTRUCTOR_LED'
            ? true
            : router.createUrlTree(['/teacher/courses', courseId, 'editor', 'info'])
        ),
        catchError(() => of(router.createUrlTree(['/teacher/courses', courseId, 'editor', 'info'])))
    );
};

export const courseEditorRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./layouts/course-editor-layout/course-editor-layout.component')
            .then(m => m.CourseEditorLayoutComponent),
        children: [
            {
                path: '',
                redirectTo: 'info',
                pathMatch: 'full'
            },
            {
                path: 'info',
                loadComponent: () => import('./pages/course-info/course-info.component')
                    .then(m => m.CourseInfoComponent),
                canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
                title: 'Sửa thông tin khóa học'
            },
            {
                path: 'curriculum',
                loadComponent: () => import('./pages/course-curriculum')
                    .then(m => m.CourseCurriculumComponent),
                canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
                title: 'Sửa chương trình học'
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/course-settings/course-settings.component')
                    .then(m => m.CourseSettingsComponent),
                canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
                title: 'Cài đặt khóa học'
            },
            {
                path: 'classes',
                loadComponent: () => import('./pages/course-classes/course-classes.component')
                    .then(m => m.CourseClassesComponent),
                canActivate: [instructorLedClassesGuard],
                title: 'Quản lý lớp học'
            }
        ]
    }
];
