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
                title: 'Edit Course Info'
            },
            {
                path: 'curriculum',
                loadComponent: () => import('./pages/course-curriculum')
                    .then(m => m.CourseCurriculumComponent),
                title: 'Edit Curriculum'
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/course-settings/course-settings.component')
                    .then(m => m.CourseSettingsComponent),
                title: 'Course Settings'
            }
        ]
    }
];
