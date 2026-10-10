import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PuestoAsignado {
  id: number;
  numero: string;
  descripcion: string | null;
  vendedores: {
    primer_nombre: string;
    primer_apellido: string;
  };
  tipos_puesto: {
    nombre: string;
    precio: number;
  };
}

@Injectable({providedIn: 'root'})
export class PuestosService {

  constructor(private supabaseService: SupabaseService) {}
  private get supabase() {
    return this.supabaseService.obtenerCliente();
  }
async obtenerMisPuestos(): Promise<PuestoAsignado[]> {
  const { data: usuarioData, error: errorUsuario } =
    await this.supabase.auth.getUser();
  if (errorUsuario) {
    console.error('Error al obtener usuario:', errorUsuario);
    throw new Error(errorUsuario.message);
  }
  if (!usuarioData.user) {
    throw new Error('No hay una sesión activa.');
  }
  console.log('Usuario autenticado:', usuarioData.user.id);
  const { data, error } = await this.supabase
    .from('puestos')
    .select(`
      id,
      numero,
      descripcion,
      vendedores (
        primer_nombre,
        primer_apellido
      ),
      tipos_puesto (
        nombre,
        precio
      )
    `)
    .eq('cobrador_asignado_id', usuarioData.user.id)
    .eq('activo', true)
    .order('numero');
  if (error) {
    console.error('Error al consultar puestos:', error);
    throw new Error(error.message);
  }
  console.log('Puestos recibidos:', data);
  return (data ?? []) as unknown as PuestoAsignado[];
}
}
