import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const PermissionRouteGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredPermission = route.data['permission'];

    const permissions = authService.user_permissions_signal();

    if (permissions?.includes(requiredPermission)) {
        return true;
    }

    return router.createUrlTree(['/dashboard']);
};