import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CobrosService, DiaPlaza } from '../../core/services/cobros.service';

@Component({
  selector: 'app-dias-plaza',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dias_plaza.html',
  styleUrl: './dias_plaza.scss'
})
export class DiasPlazaComponent implements OnInit {
  dias: DiaPlaza[] = [];
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';
  idEditando: number | null = null;

  formulario = {
    fecha: '',
    descripcion: '',
    activo: true
  };

  constructor(
    private cobrosService: CobrosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.limpiarFormulario();
    await this.cargarDias();
  }

  limpiarFormulario(): void {
    this.idEditando = null;
    this.formulario = {
      fecha: this.obtenerFechaHoy(),
      descripcion: '',
      activo: true
    };
  }

  async cargarDias(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      this.dias = await this.cobrosService.listarTodosLosDias();
    } catch (e) {
      this.error = this.obtenerMensajeError(e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  editar(dia: DiaPlaza): void {
    this.idEditando = dia.id;
    this.formulario = {
      fecha: dia.fecha,
      descripcion: dia.descripcion ?? '',
      activo: dia.activo ?? true
    };
    this.mensaje = '';
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
    this.mensaje = '';
    this.error = '';
  }

  async guardar(): Promise<void> {
    this.error = '';
    this.mensaje = '';

    if (!this.formulario.fecha) {
      this.error = 'Debes seleccionar una fecha para el día de plaza.';
      return;
    }

    this.guardando = true;

    try {
      await this.cobrosService.guardarDiaPlaza(
        {
          fecha: this.formulario.fecha,
          descripcion: this.formulario.descripcion.trim() || null,
          activo: this.formulario.activo
        },
        this.idEditando ?? undefined
      );

      this.mensaje = this.idEditando !== null
        ? 'Día de plaza actualizado correctamente.'
        : 'Día de plaza registrado correctamente.';

      this.limpiarFormulario();
      await this.cargarDias();
    } catch (e) {
      this.error = this.obtenerMensajeError(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  async cambiarEstado(dia: DiaPlaza): Promise<void> {
    const nuevoEstado = !dia.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!confirm(`¿Deseas ${accion} el día ${this.formatearFecha(dia.fecha)}?`)) {
      return;
    }

    this.error = '';
    this.mensaje = '';

    try {
      await this.cobrosService.cambiarEstadoDia(dia.id, nuevoEstado);
      this.mensaje = `Día ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`;
      await this.cargarDias();
    } catch (e) {
      this.error = this.obtenerMensajeError(e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  volverAdmin(): void {
    this.router.navigate(['/admin']);
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.substring(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private obtenerFechaHoy(): string {
    const d = new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private obtenerMensajeError(e: unknown): string {
    return e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
  }
}