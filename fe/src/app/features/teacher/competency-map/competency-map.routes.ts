import { Routes } from '@angular/router';
import { teacherGuard } from '../../../core/guards/role.guard';

export const competencyMapRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./competency-map.component').then((m) => m.CompetencyMapComponent),
    canActivate: [teacherGuard],
    title: 'Bản đồ năng lực',
  },
];
