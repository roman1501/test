import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AccessService, StatusType } from '../access.service';
import { supabase } from '../supabase.client';

@Component({
  selector: 'app-access-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-status.html',
  styleUrl: './access-status.scss',
})
export class AccessStatusComponent implements OnInit, OnDestroy {
  private readonly accessService = inject(AccessService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private pollId: any = null;
  private profileId: string | null = null;

  protected readonly status = signal<StatusType>('pending');
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly title = computed(() => {
    switch (this.status()) {
      case 'pending':
        return 'Заявка очікує підтвердження';
      case 'approved':
        return 'Доступ підтверджено';
      case 'rejected':
        return 'Заявку відхилено';
      default:
        return 'Статус доступу';
    }
  });

  protected readonly description = computed(() => {
    switch (this.status()) {
      case 'pending':
        return 'Адмін перевіряє ваші дані. Якщо очікування затягнулося — напишіть адміну в Telegram.';
      case 'approved':
        return 'Ваш акаунт підтверджено. Можете переходити до робочого кабінету.';
      case 'rejected':
        return 'Заявку відхилено. Напишіть адміну, щоб уточнити причину або подати повторно.';
      case 'none':
      default:
        return 'Акаунт не знайдено. Спробуйте зареєструватися ще раз.';
    }
  });

  async ngOnInit(): Promise<void> {
    const statusFromService = this.accessService.currentStatus();
    const statusFromRoute = this.route.snapshot.queryParamMap.get('status') as StatusType | null;
    const profileIdFromRoute = this.route.snapshot.queryParamMap.get('profileId');

    this.profileId = profileIdFromRoute ?? this.accessService.currentProfileId();
    const initialStatus = statusFromRoute ?? statusFromService ?? 'none';
    this.status.set(initialStatus);
    this.accessService.setSession(initialStatus, this.profileId);

    if (initialStatus === 'none') {
      this.isLoading.set(false);
      this.errorMessage.set('Акаунт не знайдено.');
      this.accessService.setSession('none');
      return;
    }

    if (!this.profileId) {
      this.isLoading.set(false);
      this.errorMessage.set('Профіль не знайдено. Спробуйте увійти знову.');
      this.status.set('none');
      this.accessService.setSession('none');
      return;
    }

    await this.refreshStatus();

    // Поки pending — підтягуємо статус кожні 5 секунд
    if (this.status() === 'pending' && this.profileId) {
      this.pollId = setInterval(() => {
        this.refreshStatus();
      }, 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  private async refreshStatus(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', this.profileId)
      .maybeSingle();

    this.isLoading.set(false);

    if (error) {
      console.error(error);
      this.errorMessage.set('Не вдалося отримати статус. Спробуйте пізніше.');
      return;
    }

    if (!profile) {
      this.status.set('none');
      this.accessService.setSession('none');
      this.errorMessage.set('Акаунт не знайдено.');
      return;
    }

    const rawStatus = profile.status as 'pending' | 'approved' | 'rejected';
    this.status.set(rawStatus);
    this.accessService.setSession(rawStatus, this.profileId);

    if (rawStatus === 'approved') {
      this.accessService.approveSession();
    }

    if (rawStatus !== 'pending' && this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  protected contactAdmin(): void {
    window.open('https://t.me/SavchenkoUA', '_blank'); // 👈 твій Telegram
  }

  protected goToDashboard(): void {
    this.accessService.setSession('approved', this.profileId);
    this.accessService.approveSession();
    this.router.navigate(['/dashboard']);
  }

  protected goToAuth(mode: 'login' | 'signup' = 'login'): void {
    this.accessService.clearSession();
    this.router.navigate(['/auth'], { queryParams: { mode } });
  }
}
