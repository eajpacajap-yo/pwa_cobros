import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface TipoPuesto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
}

export interface VendedorOpcion {
  id: number;
  primer_nombre: string;
  primer_apellido: string;
  activo: boolean;
}

export interface CobradorOpcion {
  id: string;
  primer_nombre: string;
  primer_apellido: string;
  rol: string;
  activo: boolean;
}

export interface PuestoAdmin {
  id: number;
  numero: string;
  descripcion: string | null;
  vendedor_id: number;
  tipo_puesto_id: number;
  cobrador_asignado_id: string | null;
  activo: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class GestionPuestosService {
  private supabase: SupabaseClient;
  constructor(supabaseService: SupabaseService) {
    this.supabase = supabaseService.obtenerCliente();
  }
  // TIPOS DE PUESTO

  async listarTipos(): Promise<TipoPuesto[]> {
    const { data, error } = await this.supabase
      .from('tipos_puesto')
      .select('id, nombre, descripcion, precio, activo')
      .order('nombre');
    if (error) {
      throw new Error('Error al cargar tipos de puesto: ' + error.message);
    }
    return (data ?? []) as TipoPuesto[];
  }
  async guardarTipo(
    datos: Omit<TipoPuesto, 'id'>,
    id?: number
  ): Promise<void> {
    if (id !== undefined) {
      const { error } = await this.supabase
        .from('tipos_puesto')
        .update(datos)
        .eq('id', id);
      if (error) {
        throw new Error('No se pudo actualizar el tipo: ' + error.message);
      }
      return;
    }

    const { error } = await this.supabase
      .from('tipos_puesto')
      .insert(datos);

    if (error) {
      throw new Error('No se pudo crear el tipo: ' + error.message);
    }
  }
  //  VENDEDORES Y COBRADORES 

  async listarVendedores(): Promise<VendedorOpcion[]> {
    const { data, error } = await this.supabase
      .from('vendedores')
      .select('id, primer_nombre, primer_apellido, activo')
      .eq('activo', true)
      .order('primer_apellido');
    if (error) {
      throw new Error('Error al cargar vendedores: ' + error.message);
    }
    return (data ?? []) as VendedorOpcion[];
  }
  async listarCobradores(): Promise<CobradorOpcion[]> {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, primer_nombre, primer_apellido, rol, activo')
      .eq('rol', 'COBRADOR')
      .eq('activo', true)
      .order('id');
    if (error) {
      throw new Error('Error al cargar cobradores: ' + error.message);
    }
    return (data ?? []) as CobradorOpcion[];
  }

  //  PUESTOS 
  async listarPuestos(): Promise<PuestoAdmin[]> {
    const { data, error } = await this.supabase
      .from('puestos')
      .select(
        'id, numero, descripcion, vendedor_id, tipo_puesto_id, cobrador_asignado_id, activo'
      )
      .order('numero');
    if (error) {
      throw new Error('Error al cargar puestos: ' + error.message);
    }
    return (data ?? []) as PuestoAdmin[];
  }
  async guardarPuesto(
    datos: Omit<PuestoAdmin, 'id'>,
    id?: number
  ): Promise<void> {
    if (id !== undefined) {
      const { error } = await this.supabase
        .from('puestos')
        .update(datos)
        .eq('id', id);
      if (error) {
        throw new Error('No se pudo actualizar el puesto: ' + error.message);
      }
      return;
    }
    const { error } = await this.supabase
      .from('puestos')
      .insert(datos);

    if (error) {
      throw new Error('No se pudo crear el puesto: ' + error.message);
    }
  }
}