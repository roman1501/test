import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

type AccessStatus = 'signup_pending' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-access-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-status.html',
  styleUrls: ['./access-status.scss'],
})
export class AccessStatusComponent {
  // хто ми такі на цьому екрані
  protected readonly fullName = signal<string | null>(null);
  protected readonly telegramUserId = signal<number | null>(null);
  protected readonly status = signal<AccessStatus>('pending');

  // твій Telegram для звʼязку
  protected readonly adminTelegramUsername = 'SavchenkoUA';

  protected readonly title = computed(() => {
    switch (this.status()) {
      case 'signup_pending':
        return 'Заявка на доступ відправлена';
      case 'pending':
        return 'Заявка ще на перевірці';
      case 'rejected':
        return 'Доступ відхилено';
      case 'approved':
        return 'Доступ підтверджено';
      default:
        return 'Статус доступу';
    }
  });

  protected readonly description = computed(() => {
    switch (this.status()) {
      case 'signup_pending':
        return 'Адміністратор отримав вашу заявку в Telegram і перевіряє дані. Як тільки доступ буде підтверджено — ви зможете увійти тим самим ключем.';
      case 'pending':
        return 'Ваша заявка ще очікує рішення адміністратора. Спробуйте пізніше або напишіть адміну, якщо це займає занадто багато часу.';
      case 'rejected':
        return 'Наразі доступ відхилено. Перевірте, чи коректно вказані дані, та за потреби звʼяжіться з адміністратором для уточнення.';
      case 'approved':
        return 'Ваш доступ підтверджено. Ви можете використовувати свій ключ, щоб заходити в систему з цього Telegram-акаунту.';
      default:
        return 'Перевірка статусу доступу.';
    }
  });

  constructor(private readonly router: Router) {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras.state ?? {}) as {
      status?: AccessStatus;
      fullName?: string;
      telegramUserId?: number;
    };

    if (state.status) {
      this.status.set(state.status);
    }

    if (state.fullName) {
      this.fullName.set(state.fullName);
    }

    if (state.telegramUserId) {
      this.telegramUserId.set(state.telegramUserId);
    }
  }

  protected goBackToAuth(): void {
    this.router.navigate(['/auth']); // 👈 підстав свій шлях до AuthenticationComponent
  }

  protected get adminTelegramLink(): string {
    return `https://t.me/${this.adminTelegramUsername}`;
  }
}
