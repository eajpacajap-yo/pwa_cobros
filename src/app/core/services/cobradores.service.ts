import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface Cobrador {
  id: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono: string | null;
  rol: string;
  activo: boolean;
}

export interface NuevoCobrador {
  email: string;
  password: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CobradoresService {
  private supabase: SupabaseClient;

  constructor(supabaseService: SupabaseService) {
    this.supabase = supabaseService.obtenerCliente();
  }

  async listarCobradores(): Promise<Cobrador[]> {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono, rol, activo')
      .eq('rol', 'COBRADOR')
      .order('primer_apellido');

    if (error) {
      throw new Error('Error al listar cobradores: ' + error.message);
    }

    return (data ?? []) as Cobrador[];
  }

  async registrarCobrador(datos: NuevoCobrador): Promise<string> {
    const { data, error } = await this.supabase.rpc('crear_cobrador', {
      p_email: datos.email,
      p_password: datos.password,
      p_primer_nombre: datos.primer_nombre,
      p_segundo_nombre: datos.segundo_nombre || '',
      p_primer_apellido: datos.primer_apellido,
      p_segundo_apellido: datos.segundo_apellido || '',
      p_telefono: datos.telefono || ''
    });

    if (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique')) {
        throw new Error('El correo electrónico ya se encuentra registrado.');
      }
      throw new Error(error.message);
    }

    return data as string;
  }

  async cambiarEstado(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('perfiles')
      .update({ activo })
      .eq('id', id);

    if (error) {
      throw new Error('Error al actualizar estado del cobrador: ' + error.message);
    }
  }
  // Actualizar datos del cobrador en la tabla perfiles
  async actualizarCobrador(
    id: string,
    datos: {
      primer_nombre: string;
      segundo_nombre: string | null;
      primer_apellido: string;
      segundo_apellido: string | null;
      telefono: string | null;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('perfiles')
      .update({
        primer_nombre: datos.primer_nombre.trim(),
        segundo_nombre: datos.segundo_nombre?.trim() || null,
        primer_apellido: datos.primer_apellido.trim(),
        segundo_apellido: datos.segundo_apellido?.trim() || null,
        telefono: datos.telefono?.trim() || null
      })
      .eq('id', id);

    if (error) {
      throw new Error('Error al actualizar datos del cobrador: ' + error.message);
    }
  }
}