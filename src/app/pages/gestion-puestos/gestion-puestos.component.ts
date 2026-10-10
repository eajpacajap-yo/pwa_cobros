import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router,  } from '@angular/router';
import { GestionPuestosService } from '../../core/services/gestion-puestos.service';
import { TipoPuesto, VendedorOpcion, CobradorOpcion, PuestoAdmin } from '../../core/services/gestion-puestos.service';

@Component({
  selector: 'app-gestion-puestos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-puestos.component.html',
  styleUrl: './gestion-puestos.component.scss'
})
export class GestionPuestosComponent implements OnInit {
  seccion: 'puestos' | 'tipos' = 'puestos';
  tipos: TipoPuesto[] = [];
  vendedores: VendedorOpcion[] = [];
  cobradores: CobradorOpcion[] = [];
  puestos: PuestoAdmin[] = [];
  cargando = false;
  guardando = false;
  error = '';
  mensaje = '';
  idTipoEditando: number | null = null;
  idPuestoEditando: number | null = null;

  tipoForm = {
    nombre: '',
    descripcion: '',
    precio: 0,
    activo: true
  };

  puestoForm = {
    numero: '',
    descripcion: '',
    vendedor_id: 0,
    tipo_puesto_id: 0,
    cobrador_asignado_id: '',
    activo: true
  };

  constructor(
    private servicio: GestionPuestosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      const [tipos, vendedores, cobradores, puestos] =
        await Promise.all([
          this.servicio.listarTipos(),
          this.servicio.listarVendedores(),
          this.servicio.listarCobradores(),
          this.servicio.listarPuestos()
        ]);

      this.tipos = tipos;
      this.vendedores = vendedores;
      this.cobradores = cobradores;
      this.puestos = puestos;
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  // ---------- TIPOS ----------

  editarTipo(tipo: TipoPuesto): void {
    this.idTipoEditando = tipo.id;
    this.tipoForm = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      precio: Number(tipo.precio),
      activo: tipo.activo
    };

    this.mensaje = '';
    this.error = '';
  }

  cancelarTipo(): void {
    this.idTipoEditando = null;
    this.tipoForm = {
      nombre: '',
      descripcion: '',
      precio: 0,
      activo: true
    };
  }

  async guardarTipo(): Promise<void> {
    this.error = '';
    this.mensaje = '';

    if (!this.tipoForm.nombre.trim()) {
      this.error = 'Escribe el nombre del tipo de puesto.';
      return;
    }

    if (!Number.isFinite(this.tipoForm.precio) || this.tipoForm.precio < 0) {
      this.error = 'El precio debe ser un número válido igual o mayor a cero.';
      return;
    }

    this.guardando = true;

    try {
      await this.servicio.guardarTipo({
        nombre: this.tipoForm.nombre.trim(),
        descripcion: this.tipoForm.descripcion.trim() || null,
        precio: Number(this.tipoForm.precio),
        activo: this.tipoForm.activo
      }, this.idTipoEditando ?? undefined);

      this.mensaje = this.idTipoEditando === null
        ? 'Tipo de puesto creado.'
        : 'Tipo de puesto actualizado.';

      this.cancelarTipo();
      await this.cargarDatos();
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // ---------- PUESTOS ----------

  editarPuesto(puesto: PuestoAdmin): void {
    this.idPuestoEditando = puesto.id;
    this.puestoForm = {
      numero: puesto.numero,
      descripcion: puesto.descripcion ?? '',
      vendedor_id: puesto.vendedor_id,
      tipo_puesto_id: puesto.tipo_puesto_id,
      cobrador_asignado_id: puesto.cobrador_asignado_id ?? '',
      activo: puesto.activo
    };

    this.mensaje = '';
    this.error = '';
  }

  cancelarPuesto(): void {
    this.idPuestoEditando = null;
    this.puestoForm = {
      numero: '',
      descripcion: '',
      vendedor_id: 0,
      tipo_puesto_id: 0,
      cobrador_asignado_id: '',
      activo: true
    };
  }

  async guardarPuesto(): Promise<void> {
    this.error = '';
    this.mensaje = '';

    if (!this.puestoForm.numero.trim()) {
      this.error = 'El número de puesto es obligatorio.';
      return;
    }

    if (!this.puestoForm.vendedor_id || !this.puestoForm.tipo_puesto_id) {
      this.error = 'Selecciona un vendedor y un tipo de puesto.';
      return;
    }

    const vendedorYaAsignado = this.puestos.some(p =>
      p.vendedor_id === Number(this.puestoForm.vendedor_id) &&
      p.id !== this.idPuestoEditando &&
      p.activo
    );

    if (vendedorYaAsignado) {
      this.error =
        'Este vendedor ya tiene un puesto activo. Cada vendedor debe tener un solo puesto permanente.';
      return;
    }

    const numeroDuplicado = this.puestos.some(p =>
      p.numero.trim().toLowerCase() ===
        this.puestoForm.numero.trim().toLowerCase() &&
      p.id !== this.idPuestoEditando
    );

    if (numeroDuplicado) {
      this.error = 'Ya existe un puesto con ese número.';
      return;
    }

    this.guardando = true;

    try {
      await this.servicio.guardarPuesto({
        numero: this.puestoForm.numero.trim(),
        descripcion: this.puestoForm.descripcion.trim() || null,
        vendedor_id: Number(this.puestoForm.vendedor_id),
        tipo_puesto_id: Number(this.puestoForm.tipo_puesto_id),
        cobrador_asignado_id:
          this.puestoForm.cobrador_asignado_id || null,
        activo: this.puestoForm.activo
      }, this.idPuestoEditando ?? undefined);

      this.mensaje = this.idPuestoEditando === null
        ? 'Puesto creado y asignado correctamente.'
        : 'Puesto actualizado correctamente.';

      this.cancelarPuesto();
      await this.cargarDatos();
    } catch (e) {
      this.error = this.mensajeError(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  nombreVendedor(id: number): string {
    const v = this.vendedores.find(item => item.id === id);

    return v
      ? `${v.primer_nombre} ${v.primer_apellido}`
      : `Vendedor #${id}`;
  }

  nombreTipo(id: number): string {
    return this.tipos.find(t => t.id === id)?.nombre ??
      `Tipo #${id}`;
  }

  nombreCobrador(id: string | null): string {
    if (!id) {
      return 'Sin asignar';
    }

    const cobrador = this.cobradores.find(c => c.id === id);

    return cobrador
      ? `${cobrador.primer_nombre} ${cobrador.primer_apellido}`
      : 'Perfil no disponible';
  }

  volverAdmin(): void {
    this.router.navigate(['/admin']);
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado.';
  }
}