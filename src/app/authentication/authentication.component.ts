import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss'
})
export class AuthenticationComponent {
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
    'Маєте контроль за ключем у будь-який момент',
    'Можете підготувати дані і завершити пізніше'
  ];

  protected successMessage = '';

  protected switchMode(newMode: 'login' | 'signup'): void {
    this.mode.set(newMode);
    this.successMessage = '';

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

  protected submit(): void {
    this.authForm.markAllAsTouched();

    if (
      this.mode() === 'signup' &&
      this.authForm.value.password !== this.authForm.value.confirmPassword
    ) {
      this.authForm.controls.confirmPassword.setErrors({ mismatch: true });
    }

    if (this.authForm.invalid) {
      return;
    }

    this.successMessage =
      this.mode() === 'login'
        ? 'Вхід за ключем виконано (UI-демо без бекенду).'
        : 'Заявка на створення акаунту збережена у демонстраційному режимі.';
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
