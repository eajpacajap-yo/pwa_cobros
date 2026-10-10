import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

export type EstadoCobro = 'COBRADO' | 'NO_LLEGO';

export interface DiaPlaza {
  id: number;
  fecha: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CobroRegistrado {
  id: number;
  puesto_id: number;
  estado: EstadoCobro;
  monto: number;
  foto_url: string | null;
  observacion: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CobrosService {
  private supabase: SupabaseClient;

  constructor(supabaseService: SupabaseService) {
    this.supabase = supabaseService.obtenerCliente();
  }

  // Obtener los días de plaza disponibles.
  async obtenerDiasPlaza(): Promise<DiaPlaza[]> {
  const { data, error } = await this.supabase
    .from('dias_plaza')
    .select('id, fecha')
    .eq('activo', true)
    .order('fecha', { ascending: false })
    .limit(60);

  if (error) {
    throw new Error('No se pudieron consultar los días de plaza: ' + error.message);
  }

  return (data ?? []) as DiaPlaza[];
}

  // Obtener los cobros ya registrados para un día.
  async obtenerCobrosDelDia(
    diaPlazaId: number
  ): Promise<CobroRegistrado[]> {
    const { data, error } = await this.supabase
      .from('cobros')
      .select('id, puesto_id, estado, monto, foto_url, observacion')
      .eq('dia_plaza_id', diaPlazaId);

    if (error) {
      console.error('Error consultando cobros:', error);
      throw new Error(
        'No se pudieron consultar los cobros: ' + error.message
      );
    }

    return (data ?? []) as CobroRegistrado[];
  }

  // Registrar un cobro o una inasistencia.
  async registrarCobro(
    diaPlazaId: number,
    puestoId: number,
    estado: EstadoCobro,
    observacion: string,
    fotografia: File | null
  ): Promise<CobroRegistrado> {
    const { data: usuarioData, error: errorUsuario } =
      await this.supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) {
      throw new Error('La sesión no está activa. Inicia sesión nuevamente.');
    }

    const usuarioId = usuarioData.user.id;

    // Una inasistencia debe tener evidencia fotográfica.
    if (estado === 'NO_LLEGO' && !fotografia) {
      throw new Error(
        'Debes seleccionar una fotografía del puesto vacío.'
      );
    }

    // Validar la imagen antes de subirla.
    if (fotografia) {
      if (!fotografia.type.startsWith('image/')) {
        throw new Error('El archivo seleccionado debe ser una imagen.');
      }

      if (fotografia.size > 5 * 1024 * 1024) {
        throw new Error('La fotografía no debe superar los 5 MB.');
      }
    }

    let rutaFotografia: string | null = null;

    // Guardar primero la fotografía, si se seleccionó una.
    if (fotografia) {
      const extension = this.obtenerExtension(fotografia);

      rutaFotografia =
        `${usuarioId}/${diaPlazaId}/` +
        `puesto-${puestoId}-${Date.now()}.${extension}`;

      const { error: errorSubida } = await this.supabase
        .storage
        .from('evidencias_puestos')
        .upload(rutaFotografia, fotografia, {
          contentType: fotografia.type,
          upsert: false
        });

      if (errorSubida) {
        console.error('Error subiendo fotografía:', errorSubida);

        throw new Error(
          'No se pudo guardar la fotografía: ' + errorSubida.message
        );
      }
    }

    // No enviamos "monto": el trigger de Supabase debe calcularlo.
    const { data, error } = await this.supabase
      .from('cobros')
      .insert({
        dia_plaza_id: diaPlazaId,
        puesto_id: puestoId,
        cobrador_id: usuarioId,
        estado,
        foto_url: rutaFotografia,
        observacion: observacion.trim() || null
      })
      .select('id, puesto_id, estado, monto, foto_url, observacion')
      .single();

    if (error) {
      console.error('Error registrando cobro:', error);

      // Si falló el registro, intentamos retirar la imagen que
      // acabamos de subir para evitar evidencias huérfanas.
      if (rutaFotografia) {
        const { error: errorLimpieza } = await this.supabase
          .storage
          .from('evidencias_puestos')
          .remove([rutaFotografia]);

        if (errorLimpieza) {
          console.warn(
            'No se pudo retirar la fotografía temporal:',
            errorLimpieza
          );
        }
      }

      if (error.code === '23505') {
        throw new Error(
          'Este puesto ya tiene un registro para el día seleccionado.'
        );
      }

      throw new Error(
        'No se pudo registrar el resultado: ' + error.message
      );
    }

    return data as unknown as CobroRegistrado;
  }

  private obtenerExtension(archivo: File): string {
    const extension = archivo.name.split('.').pop()?.toLowerCase();

    const extensionesPermitidas = [
      'jpg', 'jpeg', 'png', 'webp', 'heic'
    ];

    if (extension && extensionesPermitidas.includes(extension)) {
      return extension;
    }

    // Si el nombre no tiene una extensión reconocida,
    // usar una extensión acorde con el MIME.
    const extensionesPorMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic'
    };

    return extensionesPorMime[archivo.type] ?? 'jpg';
  }

  async listarTodosLosDias(): Promise<DiaPlaza[]> {
    const { data, error } = await this.supabase
      .from('dias_plaza')
      .select('id, fecha, descripcion, activo')
      .order('fecha', { ascending: false });

    if (error) {
      throw new Error('Error al cargar días de plaza: ' + error.message);
    }

    return (data ?? []) as DiaPlaza[];
  }

  // Guardar (crear o editar) un día de plaza
  async guardarDiaPlaza(
    datos: { fecha: string; descripcion: string | null; activo: boolean },
    id?: number
  ): Promise<void> {
    if (id !== undefined) {
      const { error } = await this.supabase
        .from('dias_plaza')
        .update(datos)
        .eq('id', id);

      if (error) {
        throw new Error('No se pudo actualizar el día de plaza: ' + error.message);
      }
      return;
    }

    const { error } = await this.supabase
      .from('dias_plaza')
      .insert(datos);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un día de plaza registrado para esa fecha.');
      }
      throw new Error('No se pudo crear el día de plaza: ' + error.message);
    }
  }

  // Cambiar estado activo/inactivo
  async cambiarEstadoDia(id: number, activo: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('dias_plaza')
      .update({ activo })
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo cambiar el estado: ' + error.message);
    }
  }

}