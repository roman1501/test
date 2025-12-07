import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessService, StatusType } from '../access.service';
import { supabase } from '../supabase.client';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
})
export class AuthenticationComponent implements OnInit {
  protected readonly mode = signal<'login' | 'signup'>('login');

  protected readonly highlightText = computed(() =>
    this.mode() === 'login' ? 'Повернення до доступу' : 'Нова безпечна реєстрація'
  );

  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accessService = inject(AccessService);

  protected readonly authForm = this.formBuilder.group({
    fullName: this.formBuilder.control('', []),
    password: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: this.formBuilder.control('', []),
    facePhoto: this.formBuilder.control<File | null>(null, []),
  });

  protected readonly benefitList = [
    'Робіть запити на доступ без паперів',
    'Підтвердження через ваш Telegram-акаунт',
    'Можете підготувати дані і завершити пізніше',
  ];

  protected successMessage = '';
  protected errorMessage = '';
  protected isSubmitting = false;

  async ngOnInit(): Promise<void> {
    this.applyModeFromRoute();

    const telegramUserId = this.getTelegramUserId();
    if (!telegramUserId) return;

    // Якщо вже є pending — одразу кидаємо в /auth-status
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('telegram_user_id', telegramUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (profile?.status === 'pending') {
      this.accessService.setSession('pending', profile.id);
      await this.router.navigate(['/auth-status'], {
        queryParams: { status: 'pending', profileId: profile.id },
      });
    }
  }
  private applyModeFromRoute(): void {
    const requestedMode = this.route.snapshot.queryParamMap.get('mode') as
      | 'login'
      | 'signup'
      | null;

    if (requestedMode) {
      this.switchMode(requestedMode);
    }
  }
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

    if (this.authForm.invalid) return;

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
    const w = window as any;
    const tg = w?.Telegram?.WebApp;

    // якщо скрипт Telegram WebApp не підключений / не всередині Telegram
    if (!tg) {
      console.warn('Telegram WebApp not detected');
      return null;
    }

    const user = tg?.initDataUnsafe?.user;

    if (!user || typeof user.id === 'undefined') {
      console.warn('No Telegram user in initDataUnsafe');
      return null;
    }

    return Number(user.id);
  }


  private async handleSignup(): Promise<void> {
    const telegramUserId = this.getTelegramUserId();

    if (!telegramUserId) {
      this.errorMessage = 'Цей екран потрібно запускати всередині Telegram WebApp.';
      this.accessService.clearSession();
      return;
    }

    const { fullName, password, facePhoto } = this.authForm.value;

    // 1) Завантажуємо фото в Storage
    let facePhotoUrl: string | null = null;

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

      const { data: publicUrlData } = supabase.storage.from('faces-bucket').getPublicUrl(filePath);

      facePhotoUrl = publicUrlData.publicUrl;
    }

    // 2) Викликаємо Edge Function request-access через supabase-js
    try {
      const { data, error } = await supabase.functions.invoke('request-access', {
        body: {
          telegram_user_id: telegramUserId,
          full_name: fullName,
          access_key: password,
          face_photo_url: facePhotoUrl,
        },
      });

      if (error) {
        console.error('request-access error', error);
        this.errorMessage = 'Помилка надсилання заявки адміністратору.';
        this.accessService.clearSession();
        return;
      }

      const profileId = (data as any)?.profile?.id ?? (data as any)?.profileId ?? null;
      if (!profileId) {
        this.errorMessage = 'Не вдалося створити заявку. Спробуйте знову.';
        this.accessService.clearSession();
        return;
      }

      // ✅ Одразу переходимо на екран статусу з pending
      this.accessService.setSession('pending', profileId);
      await this.router.navigate(['/auth-status'], {
        queryParams: { status: 'pending', profileId },
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
      this.accessService.clearSession();
      return;
    }

    const { password } = this.authForm.value;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('access_key', password)
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (error) {
      this.errorMessage = 'Невірний ключ доступу або акаунт не знайдено.';
      return;
    }

    if (!profile) {
      this.errorMessage = '';
      this.accessService.setSession('none');
      await this.router.navigate(['/auth-status'], {
        queryParams: { status: 'none' },
      });
      return;
    }

    if (profile.status === 'pending') {
      this.accessService.setSession('pending', profile.id);
      await this.router.navigate(['/auth-status'], {
        queryParams: { status: 'pending', profileId: profile.id },
      });
      return;
    }

    if (profile.status === 'rejected') {
      this.accessService.setSession('rejected', profile.id);
      await this.router.navigate(['/auth-status'], {
        queryParams: { status: 'rejected', profileId: profile.id },
      });
      return;
    }

    if (profile.status === 'approved') {
      const status: StatusType = 'approved';
      this.accessService.setSession(status, profile.id);
      await this.router.navigate(['/dashboard']);
      return;
    }

    this.accessService.setSession('none');
    await this.router.navigate(['/auth-status'], { queryParams: { status: 'none' } });
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
