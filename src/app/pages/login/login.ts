
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {

  correo = '';
  contrasena = '';
  mensajeError = '';
  cargando = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async iniciarSesion(): Promise<void> {
    this.mensajeError = '';

    if (!this.correo.trim() || !this.contrasena) {
      this.mensajeError = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.cargando = true;

    try {
      const perfil = await this.authService.iniciarSesion(
        this.correo.trim(),
        this.contrasena
      );

      if (perfil.rol === 'ADMIN') {
        await this.router.navigate(['/admin']);
      } else {
        await this.router.navigate(['/cobrador']);
      }

    } catch (error) {
      this.mensajeError = error instanceof Error
        ? error.message
        : 'Ocurrió un error al iniciar sesión.';
    } finally {
      this.cargando = false;
    }
  }
}
