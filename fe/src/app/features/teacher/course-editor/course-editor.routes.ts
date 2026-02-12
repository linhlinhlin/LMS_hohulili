import { Routes } from '@angular/router';

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
                title: 'Sửa thông tin khóa học'
            },
            {
                path: 'curriculum',
                loadComponent: () => import('./pages/course-curriculum')
                    .then(m => m.CourseCurriculumComponent),
                title: 'Sửa chương trình học'
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/course-settings/course-settings.component')
                    .then(m => m.CourseSettingsComponent),
                title: 'Cài đặt khóa học'
            },
            {
                path: 'classes',
                loadComponent: () => import('./pages/course-classes/course-classes.component')
                    .then(m => m.CourseClassesComponent),
                title: 'Quản lý lớp học'
            }
        ]
    }
];
