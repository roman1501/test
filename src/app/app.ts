import { Component } from '@angular/core';
import { AuthenticationComponent } from './authentication/authentication.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthenticationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
