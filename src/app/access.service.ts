import { Injectable, signal } from '@angular/core';

export type StatusType = 'pending' | 'approved' | 'rejected' | 'none';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly sessionApproved = signal(false);
  private readonly status = signal<StatusType | null>(null);

  setSessionStatus(status: StatusType): void {
    this.status.set(status);

    if (status !== 'approved') {
      this.sessionApproved.set(false);
    }
  }

  approveSession(): void {
    this.sessionApproved.set(true);
  }

  clearSession(): void {
    this.sessionApproved.set(false);
    this.status.set(null);
  }

  isSessionApproved(): boolean {
    return this.sessionApproved();
  }

  currentStatus(): StatusType | null {
    return this.status();
  }
}