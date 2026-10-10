import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface DetalleCobroReporte {
  id: number;
  puesto_numero: string;
  vendedor: string;
  cobrador: string;
  tipo_puesto: string;
  estado: string;
  monto: number;
  observacion: string | null;
  foto_url: string | null;
  fecha_hora: string;
}

export interface ResumenReporte {
  totalRecaudado: number;
  totalCobrados: number;
  totalNoLlego: number;
  totalRegistros: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private supabase: SupabaseClient;

  constructor(supabaseService: SupabaseService) {
    this.supabase = supabaseService.obtenerCliente();
  }

  async obtenerCobrosPorDia(diaPlazaId: number): Promise<DetalleCobroReporte[]> {
    const { data, error } = await this.supabase
      .from('cobros')
      .select(`
        id,
        estado,
        monto,
        observacion,
        foto_url,
        fecha_hora,
        puestos (
          numero,
          vendedores (
            primer_nombre,
            primer_apellido
          ),
          tipos_puesto (
            nombre
          )
        ),
        perfiles:cobrador_id (
          primer_nombre,
          primer_apellido
        )
      `)
      .eq('dia_plaza_id', diaPlazaId)
      .order('id');

    if (error) {
      throw new Error('Error al cargar reporte de cobros: ' + error.message);
    }

    return (data ?? []).map((c: any) => ({
      id: c.id,
      puesto_numero: c.puestos?.numero ?? 'S/N',
      vendedor: c.puestos?.vendedores 
        ? `${c.puestos.vendedores.primer_nombre} ${c.puestos.vendedores.primer_apellido}` 
        : 'Sin vendedor',
      cobrador: c.perfiles 
        ? `${c.perfiles.primer_nombre} ${c.perfiles.primer_apellido}` 
        : 'Desconocido',
      tipo_puesto: c.puestos?.tipos_puesto?.nombre ?? '—',
      estado: c.estado,
      monto: Number(c.monto) || 0,
      observacion: c.observacion,
      foto_url: c.foto_url,
      fecha_hora: c.fecha_hora
    }));
  }

  obtenerUrlEvidencia(rutaFoto: string): string {
  const { data } = this.supabase
    .storage
    .from('evidencias_puestos')
    .getPublicUrl(rutaFoto);

  return data.publicUrl;
}
}