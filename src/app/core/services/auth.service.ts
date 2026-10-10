import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PerfilUsuario {
  rol: 'ADMIN' | 'COBRADOR';
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.obtenerCliente();
  }
  
  async iniciarSesion(
    correo: string,
    contrasena: string
  ): Promise<PerfilUsuario> {

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena
    });

    if (error) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const { data: perfil, error: errorPerfil } = await this.supabase
      .from('perfiles')
      .select('rol, activo')
      .eq('id', data.user.id)
      .single();

    if (errorPerfil || !perfil) {
      await this.supabase.auth.signOut();
      throw new Error('No se encontró el perfil de este usuario.');
    }

    if (!perfil.activo) {
      await this.supabase.auth.signOut();
      throw new Error('Este usuario está desactivado.');
    }

    if (perfil.rol !== 'ADMIN' && perfil.rol !== 'COBRADOR') {
      await this.supabase.auth.signOut();
      throw new Error('El rol del usuario no es válido.');
    }

    return perfil as PerfilUsuario;
  }

  async cerrarSesion(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error('No se pudo cerrar la sesión.');
    }
  }

  async obtenerPerfilActual(): Promise<PerfilUsuario | null> {
    const { data: usuarioData, error: errorUsuario } =
      await this.supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) {
      return null;
    }

    const { data: perfil, error } = await this.supabase
      .from('perfiles')
      .select('rol, activo')
      .eq('id', usuarioData.user.id)
      .single();

    if (error || !perfil || !perfil.activo) {
      return null;
    }

    if (perfil.rol !== 'ADMIN' && perfil.rol !== 'COBRADOR') {
      return null;
    }

    return perfil as PerfilUsuario;
  }
}