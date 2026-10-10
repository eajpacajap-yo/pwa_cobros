import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const perfil = await authService.obtenerPerfilActual();

  if (!perfil) {
    return router.createUrlTree(['/login']);
  }

  const rolesPermitidos = route.data['roles'] as string[] | undefined;

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    if (perfil.rol === 'ADMIN') {
      return router.createUrlTree(['/admin']);
    }

    return router.createUrlTree(['/cobrador']);
  }

  return true;
};
