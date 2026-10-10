import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Vendedor {
  id: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono: string | null;
  identificacion: string | null;
  activo: boolean;
  created_at?: string;
}

export type DatosVendedor = Omit<
  Vendedor,
  'id' | 'created_at'
>;

@Injectable({
  providedIn: 'root'
})
export class VendedoresService {
  private supabase: SupabaseClient;

  constructor(supabaseService: SupabaseService) {
    this.supabase = supabaseService.obtenerCliente();
  }

  async listar(): Promise<Vendedor[]> {
    const { data, error } = await this.supabase
      .from('vendedores')
      .select(`
        id,
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        telefono,
        identificacion,
        activo,
        created_at
      `)
      .order('primer_apellido', { ascending: true });

    if (error) {
      console.error('Error al consultar vendedores:', error);
      throw new Error(
        'No se pudieron cargar los vendedores: ' + error.message
      );
    }

    return (data ?? []) as Vendedor[];
  }

  async crear(datos: DatosVendedor): Promise<Vendedor> {
    const { data, error } = await this.supabase
      .from('vendedores')
      .insert(datos)
      .select()
      .single();

    if (error) {
      console.error('Error al crear vendedor:', error);
      throw new Error(
        'No se pudo registrar el vendedor: ' + error.message
      );
    }

    return data as Vendedor;
  }

  async actualizar(
    id: number,
    datos: DatosVendedor
  ): Promise<Vendedor> {
    const { data, error } = await this.supabase
      .from('vendedores')
      .update(datos)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar vendedor:', error);
      throw new Error(
        'No se pudo actualizar el vendedor: ' + error.message
      );
    }

    return data as Vendedor;
  }

  async cambiarEstado(
    id: number,
    activo: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('vendedores')
      .update({ activo })
      .eq('id', id);

    if (error) {
      console.error('Error al cambiar estado:', error);
      throw new Error(
        'No se pudo cambiar el estado: ' + error.message
      );
    }
  }
}