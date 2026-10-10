import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PuestosService, PuestoAsignado } from '../../core/services/puestos.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CobrosService,
  CobroRegistrado,
  DiaPlaza,
  EstadoCobro
} from '../../core/services/cobros.service';

@Component({
  selector: 'app-cobrador-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobrador-dashboard.html',
  styleUrl: './cobrador-dashboard.scss'
})
export class CobradorDashboardComponent implements OnInit {
  puestos: PuestoAsignado[] = [];
  diasPlaza: DiaPlaza[] = [];

  diaSeleccionadoId: number | null = null;

  // Cobros existentes, organizados por el ID del puesto.
  cobrosPorPuesto: Record<number, CobroRegistrado> = {};

  // Datos temporales de cada tarjeta.
  fotografias: Record<number, File | null> = {};
  observaciones: Record<number, string> = {};
  registrando: Record<number, boolean> = {};
  mensajesPuesto: Record<number, string> = {};

  cargando = true;
  mensajeError = '';
  mensajeDia = '';

  constructor(
    private puestosService: PuestosService,
    private cobrosService: CobrosService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  
async ngOnInit(): Promise<void> {
  this.cargando = true;
  this.mensajeError = '';
  this.mensajeDia = '';

  // Mostrar los puestos en cuanto se reciban,
  // sin esperar a que termine la consulta de días de plaza.
  try {
    console.log('1. Cargando puestos...');
    this.puestos = await this.puestosService.obtenerMisPuestos();
    console.log('2. Puestos cargados:', this.puestos);
  } catch (error) {
    console.error('Error cargando puestos:', error);
    this.mensajeError = this.obtenerMensajeError(error);
  }
  // Finalizar la carga de los puestos independientemente de lo que ocurra al consultar los días de plaza.
  this.cargando = false;
  this.cdr.detectChanges();
  try {
    console.log('3. Cargando días de plaza...');
    await this.cargarDiasPlaza();
    console.log('4. Días de plaza cargados:', this.diasPlaza);
  } catch (error) {
    console.error('Error cargando días de plaza:', error);
    this.mensajeDia = this.obtenerMensajeError(error);
  } finally {
    this.cargando = false; 
    this.cdr.detectChanges();
  }

}

  // Seleccionar automáticamente el día de hoy, si existe.
  // Si no existe, utilizar el día más reciente disponible.
  async cargarDiasPlaza(): Promise<void> {
    this.diasPlaza = await this.cobrosService.obtenerDiasPlaza();

    if (this.diasPlaza.length === 0) {
      this.diaSeleccionadoId = null;
      this.mensajeDia =
        'No hay días de plaza registrados. Solicita al administrador que registre uno.';
      return;
    }

    const hoy = this.obtenerFechaLocal();
    const diaHoy = this.diasPlaza.find(dia => dia.fecha === hoy);

    this.diaSeleccionadoId = diaHoy
      ? diaHoy.id
      : this.diasPlaza[0].id;

    await this.cargarCobrosDelDia();
  }

  async alCambiarDia(): Promise<void> {
    await this.cargarCobrosDelDia();
  }

  async cargarCobrosDelDia(): Promise<void> {
    this.mensajeDia = '';
    this.cobrosPorPuesto = {};

    if (this.diaSeleccionadoId === null) {
      return;
    }
    try {
      const cobros = await this.cobrosService.obtenerCobrosDelDia(
        this.diaSeleccionadoId
      );

      for (const cobro of cobros) {
        this.cobrosPorPuesto[cobro.puesto_id] = cobro;
      }
    } catch (error) {
      console.error('Error cargando los cobros del día:', error);
      this.mensajeDia = this.obtenerMensajeError(error);
    }finally {
      this.cdr.detectChanges(); // Refresca las tarjetas y contadores del día
    }
  }

  seleccionarFotografia(puestoId: number, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.mensajesPuesto[puestoId] = '';

    if (!archivo) {
      this.fotografias[puestoId] = null;
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.fotografias[puestoId] = null;
      this.mensajesPuesto[puestoId] =
        'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.fotografias[puestoId] = null;
      this.mensajesPuesto[puestoId] =
        'La imagen debe pesar como máximo 5 MB.';
      input.value = '';
      return;
    }

    this.fotografias[puestoId] = archivo;
  }

  async registrar(
    puesto: PuestoAsignado,
    estado: EstadoCobro
  ): Promise<void> {
    const puestoId = puesto.id;
    if (this.diaSeleccionadoId === null) {
      this.mensajesPuesto[puestoId] =
        'Selecciona un día de plaza antes de continuar.';
      return;
    }

    // Bloquear el segundo registro desde la interfaz.
    if (this.cobrosPorPuesto[puestoId]) {
      this.mensajesPuesto[puestoId] =
        'Este puesto ya tiene un registro para el día seleccionado.';
      return;
    }

    const fotografia = this.fotografias[puestoId] ?? null;

    if (estado === 'NO_LLEGO' && !fotografia) {
      this.mensajesPuesto[puestoId] =
        'Debes tomar o seleccionar una fotografía del puesto vacío.';
      return;
    }

    const confirmar = estado === 'COBRADO'
      ? '¿Confirmas que el vendedor se presentó y pagó?'
      : '¿Confirmas que el vendedor no llegó y que la fotografía muestra el puesto vacío?';

    if (!confirm(confirmar)) {
      return;
    }

    this.registrando[puestoId] = true;
    this.mensajesPuesto[puestoId] = '';
    this.cdr.detectChanges();

    try {
      const cobro = await this.cobrosService.registrarCobro(
        this.diaSeleccionadoId,
        puestoId,
        estado,
        this.observaciones[puestoId] ?? '',
        fotografia
      );

      this.cobrosPorPuesto[puestoId] = cobro;
      this.mensajesPuesto[puestoId] =
        estado === 'COBRADO'
          ? 'Cobro registrado correctamente.'
          : 'Inasistencia registrada con evidencia.';

      // Limpiar los datos temporales del formulario.
      this.fotografias[puestoId] = null;
      this.observaciones[puestoId] = '';
    } catch (error) {
      console.error('Error registrando el resultado:', error);
      this.mensajesPuesto[puestoId] = this.obtenerMensajeError(error);
    } finally {
      this.registrando[puestoId] = false;
      this.cdr.detectChanges();
    }
  }

  formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.substring(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

  contarRegistrados(): number {
  return Object.keys(this.cobrosPorPuesto).length;
}

  async cerrarSesion(): Promise<void> {
    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch (error) {
      this.mensajeError = this.obtenerMensajeError(error);
    }
  }

  private obtenerFechaLocal(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private obtenerMensajeError(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado.';
  }
}

