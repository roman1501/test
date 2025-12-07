import { Injectable, signal } from '@angular/core';

export type StatusType = 'pending' | 'approved' | 'rejected' | 'none';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly sessionApproved = signal(false);
  private readonly status = signal<StatusType | null>(null);
  private readonly profileId = signal<string | null>(null);

  setSession(status: StatusType, profileId: string | null = null): void {
    this.status.set(status);
    this.profileId.set(profileId);
    this.sessionApproved.set(status === 'approved');
  }

  approveSession(): void {
    this.sessionApproved.set(true);
    if (this.status() !== 'approved') {
      this.status.set('approved');
    }
  }

  clearSession(): void {
    this.sessionApproved.set(false);
    this.status.set(null);
    this.profileId.set(null);
  }

  isSessionApproved(): boolean {
    return this.sessionApproved();
  }

  currentStatus(): StatusType | null {
    return this.status();
  }

  currentProfileId(): string | null {
    return this.profileId();
  }
}