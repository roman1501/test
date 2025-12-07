import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessService } from './access.service';

export const pendingGuard: CanActivateFn = () => {
  const accessService = inject(AccessService);
  const router = inject(Router);

  const status = accessService.currentStatus();
  if (status === 'pending') {
    router.navigate(['/auth-status'], {
      queryParams: {
        status: 'pending',
        profileId: accessService.currentProfileId() ?? undefined,
      },
    });
    return false;
  }

  return true;
};
