import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { CobradorDashboardComponent } from './pages/cobrador-dashboard/cobrador-dashboard';
import { authGuard } from './core/guards/auth-guard';
import { DiasPlazaComponent } from './pages/dias_plaza/dias_plaza';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/puestos',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./pages/gestion-puestos/gestion-puestos.component')
        .then(m => m.GestionPuestosComponent)
  },
  {
    path: 'cobrador',
    component: CobradorDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['COBRADOR'] }
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  },
 {
    path: 'admin/dias-plaza',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./pages/dias_plaza/dias_plaza')
        .then(m => DiasPlazaComponent)
  },
];
