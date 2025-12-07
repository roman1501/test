import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccessService } from '../access.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private router = inject(Router);
  private accessService = inject(AccessService);

  logout(): void {
    // очищаємо статус доступу
    this.accessService.clearSession();

    // перенаправляємо на форму входу
    this.router.navigate(['/auth']);
  }
}
