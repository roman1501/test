import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { supabase } from '../supabase.client'; // 👈 перевір шлях

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss'
})
export class AuthenticationComponent {
  // login / signup режим
  protected readonly mode = signal<'login' | 'signup'>('login');

  protected readonly highlightText = computed(() =>
    this.mode() === 'login' ? 'Повернення до доступу' : 'Нова безпечна реєстрація'
  );

  private readonly formBuilder = inject(FormBuilder);

  protected readonly authForm = this.formBuilder.group({
    fullName: this.formBuilder.control('', []),
    password: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: this.formBuilder.control('', []),
    facePhoto: this.formBuilder.control<File | null>(null, [])
  });

  protected readonly benefitList = [
    'Робіть запити на доступ без паперів',
    'Підтвердження через ваш Telegram-акаунт',
    'Можете підготувати дані і завершити пізніше'
  ];

  protected successMessage = '';
  protected errorMessage = '';
  protected isSubmitting = false;

  // URL до Edge Function request-access
  private readonly REQUEST_ACCESS_URL =
    'https://ewjvqlvzbiighbajjusg.supabase.co/functions/v1/request-access'; // 👈 підстав свій URL

  protected switchMode(newMode: 'login' | 'signup'): void {
    this.mode.set(newMode);
    this.successMessage = '';
    this.errorMessage = '';

    if (newMode === 'signup') {
      this.authForm.controls.fullName.setValidators([
        Validators.required,
        Validators.pattern(/^[А-ЩЬЮЯЇІЄҐа-щьюяїієґ\s'-]+$/)
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
    // const w = window as any;
    // const tgUser = w?.Telegram?.WebApp?.initDataUnsafe?.user;
    // if (!tgUser || typeof tgUser.id === 'undefined') {
    //   return null;
    // }
    // return Number(tgUser.id);
      return 521423479; 
  }

  private async handleSignup(): Promise<void> {
    const telegramUserId = this.getTelegramUserId();

    if (!telegramUserId) {
      this.errorMessage = 'Цей екран потрібно запускати всередині Telegram WebApp.';
      return;
    }

    const { fullName, password, facePhoto } = this.authForm.value;

    // 1) Завантажуємо фото в Supabase Storage (faces-bucket)
    let facePhotoUrl: string | null = null;

if (facePhoto) {
  const file = facePhoto as File;

  // беремо розширення (png, jpg, jpeg і т.д.)
  const ext = file.name.split('.').pop() || 'png';

  // формуємо "чистий" шлях: тільки латиниця, цифри, дефіс і крапка
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


    // 2) Надсилаємо заявку в Edge Function request-access
    try {
const response = await fetch(this.REQUEST_ACCESS_URL, {
  method: 'POST',
  headers: {
    // 👇 це головне — робимо простий Content-Type
    'Content-Type': 'text/plain',
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


      this.successMessage = 'Заявку відправлено адміністратору в Telegram для підтвердження.';
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
      this.errorMessage = 'Заявка ще очікує підтвердження адміністратора.';
      return;
    }

    if (profile.status === 'rejected') {
      this.errorMessage = 'Заявку відхилено. Зверніться до адміністратора.';
      return;
    }

    // Все добре — доступ дозволено
    this.successMessage = 'Вхід виконано. Доступ дозволено.';
    // Тут можеш зберегти щось у localStorage і перейти на інший екран
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
