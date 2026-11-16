import { SetMetadata } from '@nestjs/common';
import { Rol } from '../dominio/rol';

export const CLAVE_ROLES = 'roles-permitidos';

export const RolesPermitidos = (...roles: Rol[]) =>
  SetMetadata(CLAVE_ROLES, roles);