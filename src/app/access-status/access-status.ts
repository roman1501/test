import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { supabase } from '../supabase.client'; // 👈 шлях перевір

type UiStatus = 'created' | 'pending' | 'rejected';

@Component({
  selector: 'app-access-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-status.html',
  styleUrl: './access-status.scss',
})
export class AccessStatusComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly rawStatus = signal<UiStatus>('created');

  protected readonly status = computed(() => this.rawStatus());

  protected readonly title = computed(() => {
    switch (this.status()) {
      case 'created':
        return 'Заявку на доступ надіслано';
      case 'pending':
        return 'Заявка очікує підтвердження';
      case 'rejected':
        return 'Доступ не підтверджено';
      default:
        return 'Статус доступу';
    }
  });

  protected readonly description = computed(() => {
    switch (this.status()) {
      case 'created':
        return 'Ваші дані отримано. Адмін перевіряє фото та ключ доступу.';
      case 'pending':
        return 'Заявка вже є в системі, але ще очікує рішення адміністратора.';
      case 'rejected':
        return 'Адмін відмовив у доступі для цього ключа. Якщо це помилка — напишіть адміну в Telegram.';
      default:
        return '';
    }
  });

  protected readonly adminUsername = 'SavchenkoUA';
  protected readonly adminLink = 'https://t.me/SavchenkoUA';

  private pollIntervalId: any = null;

  ngOnInit(): void {
    // стартовий статус з query params — created / pending / rejected
    this.route.queryParamMap.subscribe((params) => {
      const statusParam = params.get('status') as UiStatus | null;
      if (statusParam === 'created' || statusParam === 'pending' || statusParam === 'rejected') {
        this.rawStatus.set(statusParam);
      } else {
        // якщо щось дивне — повертаєм на auth
        this.router.navigate(['/auth']); // 👈 підлаштуй під свій роут логіна
      }
    });

    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  // ❗ тимчасовий хардкод, як у AuthenticationComponent
  private getTelegramUserId(): number | null {
    // const w = window as any;
    // const tgUser = w?.Telegram?.WebApp?.initDataUnsafe?.user;
    // if (!tgUser || typeof tgUser.id === 'undefined') return null;
    // return Number(tgUser.id);

    return 521423479; // 👈 для тестів
  }

  private startPolling(): void {
    const telegramUserId = this.getTelegramUserId();
    if (!telegramUserId) {
      return;
    }

    // перша перевірка одразу
    this.checkProfileStatus(telegramUserId).catch(console.error);

    // потім кожні 5 секунд
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
      // профіль не знайдено → повертаєм на екран логіна
      this.router.navigate(['/auth']); // 👈 знову ж, твій шлях
      return;
    }

    const newStatus = profile.status as 'pending' | 'approved' | 'rejected';

    if (newStatus === 'pending') {
      // показуємо "очікує", якщо було created
      if (this.rawStatus() !== 'pending') {
        this.rawStatus.set('pending');
      }
    }

    if (newStatus === 'rejected') {
      // залипаємо на екрані "відхилено"
      if (this.rawStatus() !== 'rejected') {
        this.rawStatus.set('rejected');
      }
    }

    if (newStatus === 'approved') {
      // ✅ адмін підтвердив → кидаємо користувача далі
      clearInterval(this.pollIntervalId);

      // тут вирішуєш куди:
      // 1) назад на екран логіна, щоб він просто ввів ключ
      this.router.navigate(['/auth']); // 👈 твій роут компонента авторизації

      // або 2) одразу на "головний" застосунок:
      // this.router.navigate(['/app']);
    }
  }

  protected goBackToAuth(): void {
    this.router.navigate(['/auth']); // 👈 теж підлаштуй
  }
}
