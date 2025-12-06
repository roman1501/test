import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { supabase } from '../supabase.client';

type UiStatus = 'pending' | 'rejected' | 'approved';

@Component({
  selector: 'app-access-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-status.html',
  styleUrl: './access-status.scss',
})
export class AccessStatusComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly rawStatus = signal<UiStatus>('pending');
  protected readonly status = computed(() => this.rawStatus());

  protected readonly adminUsername = 'SavchenkoUA';
  protected readonly adminLink = 'https://t.me/SavchenkoUA';

  private pollIntervalId: any = null;

  protected readonly title = computed(() => {
    switch (this.status()) {
      case 'pending':
        return 'Заявка очікує підтвердження';
      case 'rejected':
        return 'Доступ відхилено';
      case 'approved':
        return 'Доступ підтверджено';
    }
  });

  protected readonly description = computed(() => {
    switch (this.status()) {
      case 'pending':
        return 'Адміністратор перевіряє ваше фото та ключ доступу. Сторінка оновиться автоматично.';
      case 'rejected':
        return 'Адміністратор відхилив заявку. Якщо вважаєте, що це помилка — напишіть адміну в Telegram.';
      case 'approved':
        return 'Доступ до системи підтверджено. Можете перейти на сайт.';
    }
  });

  ngOnInit(): void {
    // читаємо стартовий статус з query (якщо є)
    this.route.queryParamMap.subscribe((params) => {
      const s = params.get('status') as UiStatus | null;
      if (s === 'pending' || s === 'rejected' || s === 'approved') {
        this.rawStatus.set(s);
      } else {
        this.rawStatus.set('pending');
      }
    });

    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  // тимчасовий хардкод, як у AuthenticationComponent
  private getTelegramUserId(): number | null {
    // const w = window as any;
    // const tgUser = w?.Telegram?.WebApp?.initDataUnsafe?.user;
    // if (!tgUser || typeof tgUser.id === 'undefined') return null;
    // return Number(tgUser.id);
    return 521423479;
  }

  private startPolling(): void {
    const telegramUserId = this.getTelegramUserId();
    if (!telegramUserId) {
      return;
    }

    // перший запит
    this.checkProfileStatus(telegramUserId).catch(console.error);

    // далі кожні 5 сек
    this.pollIntervalId = setInterval(() => {
      this.checkProfileStatus(telegramUserId).catch(console.error);
    }, 5000);
  }

  private async checkProfileStatus(telegramUserId: number): Promise<void> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status')
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (error) {
      console.error('status poll error', error);
      return;
    }

    if (!profile) {
      // профіль зник / видалили — повертаємо на /auth
      this.router.navigate(['/auth']);
      return;
    }

    const dbStatus = profile.status as 'pending' | 'approved' | 'rejected';

    if (dbStatus === 'pending') {
      this.rawStatus.set('pending');
    }

    if (dbStatus === 'rejected') {
      this.rawStatus.set('rejected');
      // ❗ НЕ перекидаємо юзера — він тут бачить причину + кнопку написати адміну
    }

    if (dbStatus === 'approved') {
      this.rawStatus.set('approved');
      // можна зупинити пулінг, бо статус фінальний
      if (this.pollIntervalId) {
        clearInterval(this.pollIntervalId);
      }
    }
  }

  protected openAdminChat(): void {
    window.open(this.adminLink, '_blank');
  }

  protected goToSite(): void {
    // 👇 Тут шлях на твій "основний" сайт / додаток
    this.router.navigate(['/']); // або '/app', якщо так назвете
  }
}
