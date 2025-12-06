import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { supabase } from '../supabase.client';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3anZxbHZ6YmlpZ2hiYWpqdXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTQ2ODYsImV4cCI6MjA4MDU5MDY4Nn0.eWM1cw2VXPUnlce477vmleIr6A_2RAayk9m9ZlaPbxQ';
@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss'
})
export class AuthenticationComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly mode = signal<'login' | 'signup'>('login');
  protected readonly highlightText = computed(() =>
    this.mode() === 'login' ? 'Повернення до доступу' : 'Нова безпечна реєстрація'
  );

  private readonly formBuilder = inject(FormBuilder);

  protected readonly authForm = this.formBuilder.group({
    fullName: this.formBuilder.control('', []),
    password: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: this.formBuilder.control('', []),
    facePhoto: this.formBuilder.control<File | null>(null, []),
  });
async ngOnInit(): Promise<void> {
  const telegramUserId = this.getTelegramUserId();
  if (!telegramUserId) {
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('status')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  if (error) {
    console.error('auth init status error', error);
    return;
  }

  if (!profile) {
    // ще не реєструвався – можна спокійно показувати форму
    return;
  }

  if (profile.status === 'pending') {
    // ❗ є заявка, але адмін ще не відповів → назад на екран статусу
    this.router.navigate(['/access-status'], {
      queryParams: { status: 'pending' },
    });
  }
}

  protected readonly benefitList = [
    'Робіть запити на доступ без паперів',
    'Підтвердження через ваш Telegram-акаунт',
    'Можете підготувати дані і завершити пізніше',
  ];

  protected successMessage = '';
  protected errorMessage = '';
  protected isSubmitting = false;

  private readonly REQUEST_ACCESS_URL =
    'https://ewjvqlvzbiighbajjusg.supabase.co/functions/v1/request-access';

  protected switchMode(newMode: 'login' | 'signup'): void {
    this.mode.set(newMode);
    this.successMessage = '';
    this.errorMessage = '';

    if (newMode === 'signup') {
      this.authForm.controls.fullName.setValidators([
        Validators.required,
        Validators.pattern(/^[А-ЩЬЮЯЇІЄҐа-щьюяїієґ\s'-]+$/),
      ]);
      this.authForm.controls.confirmPassword.setValidators(Validators.required);
      this.authForm.controls.facePhoto.setValidators(Validators.required);
    } else {
      this.authForm.controls.fullName.clearValidators();
      this.authForm.controls.confirmPassword.clearValidators();
      this.authForm.controls.confirmPassword.setErrors(null);
      this.authForm.controls.facePhoto.clearValidators();
    }

    this.authForm.controls.fullName.updateValueAndValidity({ emitEvent: false });
    this.authForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
    this.authForm.controls.facePhoto.updateValueAndValidity({ emitEvent: false });
  }

  protected async submit(): Promise<void> {
    this.authForm.markAllAsTouched();
    this.successMessage = '';
    this.errorMessage = '';

    if (
      this.mode() === 'signup' &&
      this.authForm.value.password !== this.authForm.value.confirmPassword
    ) {
      this.authForm.controls.confirmPassword.setErrors({ mismatch: true });
    }

    if (this.authForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    try {
      if (this.mode() === 'signup') {
        await this.handleSignup();
      } else {
        await this.handleLogin();
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  private getTelegramUserId(): number | null {
    // TODO: коли будеш запускати в Telegram WebApp — розкоментуєш це
    // const w = window as any;
    // const tgUser = w?.Telegram?.WebApp?.initDataUnsafe?.user;
    // if (!tgUser || typeof tgUser.id === 'undefined') return null;
    // return Number(tgUser.id);

    return 521423479; // тимчасово для тестів
  }

private async handleSignup(): Promise<void> {
  const telegramUserId = this.getTelegramUserId();

  if (!telegramUserId) {
    this.errorMessage = 'Цей екран потрібно запускати всередині Telegram WebApp.';
    return;
  }

  const { fullName, password, facePhoto } = this.authForm.value;

  let facePhotoUrl: string | null = null;

  // 1) Завантажуємо фото в Storage
  if (facePhoto) {
    const file = facePhoto as File;
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `faces/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('faces-bucket')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      this.errorMessage = 'Помилка завантаження фото.';
      return;
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('faces-bucket')
      .getPublicUrl(filePath);

    facePhotoUrl = publicUrlData.publicUrl;
  }

  // 2) Виклик Edge Function request-access
// 2) Надсилаємо заявку в Edge Function request-access
try {
  const response = await fetch(this.REQUEST_ACCESS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      telegram_user_id: telegramUserId,
      full_name: fullName,
      access_key: password,
      face_photo_url: facePhotoUrl,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('request-access error', response.status, text);
    this.errorMessage = 'Помилка надсилання заявки адміністратору.';
    return;
  }

  // ✅ ОДРАЗУ переходимо на екран статусу
  this.router.navigate(['/access-status'], {
    queryParams: { status: 'pending' },
  });
} catch (e) {
  console.error(e);
  this.errorMessage = 'Сталася помилка при підключенні до сервера.';
}

}

  private async handleLogin(): Promise<void> {
    const telegramUserId = this.getTelegramUserId();

    if (!telegramUserId) {
      this.errorMessage = 'Цей екран потрібно запускати всередині Telegram WebApp.';
      return;
    }

    const { password } = this.authForm.value;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('access_key', password)
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (error || !profile) {
      this.errorMessage = 'Невірний ключ доступу або акаунт не знайдено.';
      return;
    }

    if (profile.status === 'pending') {
      // ⚠️ Перенаправляємо на екран очікування
      this.router.navigate(['/access-status'], {
        queryParams: { status: 'pending' },
      });
      return;
    }

    if (profile.status === 'rejected') {
      // ❌ Перенаправляємо на екран відхилення
      this.router.navigate(['/access-status'], {
        queryParams: { status: 'rejected' },
      });
      return;
    }

    // ✅ approved — тут вже твій «головний» застосунок
    this.successMessage = 'Вхід виконано. Доступ дозволено.';
    // TODO: тут ти потім зробиш router.navigate(['/app']) чи щось подібне
  }

  protected showControl(controlName: 'fullName' | 'confirmPassword' | 'facePhoto'): boolean {
    return this.mode() === 'signup';
  }

  protected handleFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.authForm.controls.facePhoto.setValue(file);
    this.authForm.controls.facePhoto.markAsTouched();
  }
}
