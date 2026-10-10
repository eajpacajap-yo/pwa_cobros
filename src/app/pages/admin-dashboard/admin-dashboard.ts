import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { VendedoresService, Vendedor, DatosVendedor } from '../../core/services/vendedores.service';
import { GestionPuestosComponent } from '../gestion-puestos/gestion-puestos.component';
import { DiasPlazaComponent } from '../dias_plaza/dias_plaza';
import { GestionCobradoresComponent } from '../gestion-cobradores/gestion-cobradores';
import { ReportesComponent } from '../reportes/reportes';

export type SeccionAdmin = 'vendedores' | 'puestos' | 'dias' | 'cobradores' | 'reportes';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GestionPuestosComponent,
    DiasPlazaComponent,
    GestionCobradoresComponent,
    ReportesComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit {
  seccionActiva: SeccionAdmin = 'vendedores';

  vendedores: Vendedor[] = [];
  buscando = false;
  guardando = false;
  mensaje = '';
  error = '';
  filtro = '';
  mostrarInactivos = false;
  idEditando: number | null = null;

  formulario: DatosVendedor = this.formularioVacio();

  constructor(
    private vendedoresService: VendedoresService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarVendedores();
  }
cambiarSeccion(seccion: SeccionAdmin): void {
  this.seccionActiva = seccion;
  this.mensaje = '';
  this.error = '';
  this.cdr.detectChanges();
}
  

  private formularioVacio(): DatosVendedor {
    return {
      primer_nombre: '',
      segundo_nombre: null,
      primer_apellido: '',
      segundo_apellido: null,
      telefono: null,
      identificacion: null,
      activo: true
    };
  }

  async cargarVendedores(): Promise<void> {
    this.buscando = true;
    this.error = '';

    try {
      this.vendedores = await this.vendedoresService.listar();
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  get vendedoresFiltrados(): Vendedor[] {
    const texto = this.filtro.trim().toLowerCase();

    return this.vendedores.filter(v => {
      const coincideTexto = [
        v.primer_nombre,
        v.segundo_nombre ?? '',
        v.primer_apellido,
        v.segundo_apellido ?? '',
        v.telefono ?? '',
        v.identificacion ?? ''
      ].join(' ').toLowerCase().includes(texto);

      return coincideTexto &&
        (this.mostrarInactivos || v.activo);
    });
  }

  editar(vendedor: Vendedor): void {
    this.idEditando = vendedor.id;

    this.formulario = {
      primer_nombre: vendedor.primer_nombre,
      segundo_nombre: vendedor.segundo_nombre,
      primer_apellido: vendedor.primer_apellido,
      segundo_apellido: vendedor.segundo_apellido,
      telefono: vendedor.telefono,
      identificacion: vendedor.identificacion,
      activo: vendedor.activo
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

    const primerNombre = this.formulario.primer_nombre.trim();
    const primerApellido = this.formulario.primer_apellido.trim();

    if (!primerNombre || !primerApellido) {
      this.error =
        'El primer nombre y el primer apellido son obligatorios.';
      return;
    }

    const datos: DatosVendedor = {
      primer_nombre: primerNombre,
      segundo_nombre:
        this.formulario.segundo_nombre?.trim() || null,
      primer_apellido: primerApellido,
      segundo_apellido:
        this.formulario.segundo_apellido?.trim() || null,
      telefono: this.formulario.telefono?.trim() || null,
      identificacion:
        this.formulario.identificacion?.trim() || null,
      activo: this.formulario.activo
    };

    this.guardando = true;

    try {
      if (this.idEditando !== null) {
        await this.vendedoresService.actualizar(
          this.idEditando,
          datos
        );

        this.mensaje = 'Vendedor actualizado correctamente.';
      } else {
        await this.vendedoresService.crear(datos);

        this.mensaje = 'Vendedor registrado correctamente.';
      }

      this.idEditando = null;
      this.formulario = this.formularioVacio();

      await this.cargarVendedores();
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  async cambiarEstado(vendedor: Vendedor): Promise<void> {
    const nuevoEstado = !vendedor.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!confirm(
      `¿Deseas ${accion} a ${vendedor.primer_nombre} ${vendedor.primer_apellido}?`
    )) {
      return;
    }

    this.error = '';
    this.mensaje = '';

    try {
      await this.vendedoresService.cambiarEstado(
        vendedor.id,
        nuevoEstado
      );

      this.mensaje = nuevoEstado
        ? 'Vendedor activado correctamente.'
        : 'Vendedor desactivado correctamente.';

      await this.cargarVendedores();
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch (e) {
      this.error = this.mensajeError(e);
    }
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado.';
  }
}