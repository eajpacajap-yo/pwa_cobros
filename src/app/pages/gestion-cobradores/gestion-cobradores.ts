import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CobradoresService, Cobrador, NuevoCobrador } from '../../core/services/cobradores.service';

@Component({
  selector: 'app-gestion-cobradores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-cobradores.html',
  styleUrl: './gestion-cobradores.scss'
})
export class GestionCobradoresComponent implements OnInit {
  cobradores: Cobrador[] = [];
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';
  filtro = '';

  idEditando: string | null = null;
  formulario: NuevoCobrador = this.formularioVacio();

  constructor(
    private cobradoresService: CobradoresService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarCobradores();
  }

  formularioVacio(): NuevoCobrador {
    return {
      email: '',
      password: '',
      primer_nombre: '',
      segundo_nombre: null,
      primer_apellido: '',
      segundo_apellido: null,
      telefono: null
    };
  }

  async cargarCobradores(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      this.cobradores = await this.cobradoresService.listarCobradores();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error al cargar cobradores.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  get cobradoresFiltrados(): Cobrador[] {
    const texto = this.filtro.trim().toLowerCase();
    if (!texto) return this.cobradores;

    return this.cobradores.filter(c =>
      [
        c.primer_nombre,
        c.segundo_nombre ?? '',
        c.primer_apellido,
        c.segundo_apellido ?? '',
        c.telefono ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto)
    );
  }

  editar(cobrador: Cobrador): void {
    this.idEditando = cobrador.id;
    this.formulario = {
      email: '',
      password: '',
      primer_nombre: cobrador.primer_nombre,
      segundo_nombre: cobrador.segundo_nombre,
      primer_apellido: cobrador.primer_apellido,
      segundo_apellido: cobrador.segundo_apellido,
      telefono: cobrador.telefono
    };
    this.mensaje = '';
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.idEditando = null;
    this.formulario = this.formularioVacio();
    this.mensaje = '';
    this.error = '';
  }

  async guardar(): Promise<void> {
    this.error = '';
    this.mensaje = '';

    if (!this.formulario.primer_nombre.trim() || !this.formulario.primer_apellido.trim()) {
      this.error = 'El primer nombre y el primer apellido son obligatorios.';
      return;
    }

    // Al crear un nuevo cobrador, correo y contraseña son obligatorios
    if (this.idEditando === null) {
      if (!this.formulario.email.trim() || !this.formulario.password) {
        this.error = 'El correo y la contraseña son requeridos para crear el acceso.';
        return;
      }

      if (this.formulario.password.length < 6) {
        this.error = 'La contraseña debe tener al menos 6 caracteres.';
        return;
      }
    }

    this.guardando = true;

    try {
      if (this.idEditando !== null) {
        // Modo Edición
        await this.cobradoresService.actualizarCobrador(this.idEditando, {
          primer_nombre: this.formulario.primer_nombre,
          segundo_nombre: this.formulario.segundo_nombre,
          primer_apellido: this.formulario.primer_apellido,
          segundo_apellido: this.formulario.segundo_apellido,
          telefono: this.formulario.telefono
        });

        this.mensaje = 'Datos del cobrador actualizados correctamente.';
      } else {
        // Modo Creación
        await this.cobradoresService.registrarCobrador(this.formulario);
        this.mensaje = 'Cobrador registrado exitosamente.';
      }

      this.cancelarEdicion();
      await this.cargarCobradores();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error al guardar cobrador.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  async cambiarEstado(cobrador: Cobrador): Promise<void> {
    const accion = cobrador.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} a ${cobrador.primer_nombre} ${cobrador.primer_apellido}?`)) return;

    this.error = '';
    this.mensaje = '';

    try {
      await this.cobradoresService.cambiarEstado(cobrador.id, !cobrador.activo);
      this.mensaje = `Cobrador ${accion === 'activar' ? 'activado' : 'desactivado'} con éxito.`;
      await this.cargarCobradores();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error al cambiar estado.';
    } finally {
      this.cdr.detectChanges();
    }
  }
}