import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { supabase } from '../supabase.client';

type StatusType = 'pending' | 'approved' | 'rejected' | 'none';

@Component({
  selector: 'app-access-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-status.html',
  styleUrl: './access-status.scss',
})
export class AccessStatusComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  private pollId: any = null;
  private telegramUserId: number | null = null;

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
        return 'Заявку не знайдено. Спробуйте зареєструватися ще раз.';
    }
  });

  async ngOnInit(): Promise<void> {
    this.telegramUserId = this.getTelegramUserId();

    if (!this.telegramUserId) {
      this.isLoading.set(false);
      this.errorMessage.set('Цей екран потрібно запускати всередині Telegram WebApp.');
      this.status.set('none');
      return;
    }

    await this.refreshStatus();

    // Поки pending — підтягуємо статус кожні 5 секунд
    if (this.status() === 'pending') {
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

  private getTelegramUserId(): number | null {
    // TODO: тут теж потім підключиш Telegram.WebApp
    return 521423479;
  }

  private async refreshStatus(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status')
      .eq('telegram_user_id', this.telegramUserId)
      .maybeSingle();

    this.isLoading.set(false);

    if (error) {
      console.error(error);
      this.errorMessage.set('Не вдалося отримати статус. Спробуйте пізніше.');
      return;
    }

    if (!profile) {
      this.status.set('none');
      return;
    }

    const rawStatus = profile.status as 'pending' | 'approved' | 'rejected';
    this.status.set(rawStatus);

    if (rawStatus !== 'pending' && this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  protected contactAdmin(): void {
    window.open('https://t.me/SavchenkoUA', '_blank'); // 👈 твій Telegram
  }

  protected goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  protected goToAuth(): void {
    this.router.navigate(['/auth']);
  }
}
