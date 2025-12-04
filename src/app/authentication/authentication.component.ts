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
    this.mode() === 'login' ? 'Welcome back' : 'Join our community'
  );
  private readonly formBuilder = inject(FormBuilder);

  protected readonly authForm = this.formBuilder.group({
    fullName: this.formBuilder.control('', []),
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    password: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: this.formBuilder.control('', [])
  });

  protected readonly benefitList = [
    'Track your projects in one place',
    'Keep your account secure',
    'Switch devices without losing progress'
  ];

  protected successMessage = '';

  protected switchMode(newMode: 'login' | 'signup'): void {
    this.mode.set(newMode);
    this.successMessage = '';

    if (newMode === 'signup') {
      this.authForm.controls.fullName.addValidators(Validators.required);
      this.authForm.controls.confirmPassword.addValidators(Validators.required);
    } else {
      this.authForm.controls.fullName.removeValidators(Validators.required);
      this.authForm.controls.confirmPassword.removeValidators(Validators.required);
      this.authForm.controls.confirmPassword.setErrors(null);
    }

    this.authForm.controls.fullName.updateValueAndValidity({ emitEvent: false });
    this.authForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
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
        ? 'You are signed in. No backend is wired up yet, but the UI is ready.'
        : 'Account created in design mode. Hook this up to your backend when ready.';
  }

  protected showControl(controlName: 'fullName' | 'confirmPassword'): boolean {
    return this.mode() === 'signup';
  }
}