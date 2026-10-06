export type RolNombre = 'usuario' | 'administrador' | 'super_admin';

export interface AuthUser {
  id: number;
  rol: RolNombre;
  correo: string;
}
