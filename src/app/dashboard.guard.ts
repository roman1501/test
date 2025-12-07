import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessService } from './access.service';

export const dashboardGuard: CanActivateFn = () => {
  const accessService = inject(AccessService);
  const router = inject(Router);

  if (accessService.isSessionApproved()) {
    return true;
  }

  const status = accessService.currentStatus();

  if (status) {
    router.navigate(['/auth-status'], { queryParams: { status } });
    return false;
  }

  router.navigate(['/auth']);
  return false;
};