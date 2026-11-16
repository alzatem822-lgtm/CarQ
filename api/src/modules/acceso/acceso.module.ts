import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfiguracionSistema } from '../../compartido/configuracion/configuracion-sistema';
import { AuthController } from './adaptadores-entrada/auth.controller';
import { EmisorTokens } from './aplicacion/emisor-tokens';
import { HasheadorContrasena } from './aplicacion/hasheador-contrasena';
import { IniciarSesion } from './aplicacion/iniciar-sesion';
import { UsuarioRepository } from './aplicacion/usuario.repository';
import { EmisorJwt } from './infraestructura/emisor-jwt';
import { HasheadorBcrypt } from './infraestructura/hasheador-bcrypt';
import { UsuarioPostgresRepository } from './infraestructura/usuario-postgres.repository';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: HasheadorContrasena, useClass: HasheadorBcrypt },
    {
      provide: EmisorTokens,
      useFactory: (configuracion: ConfiguracionSistema) =>
        new EmisorJwt(
          configuracion.obtener('JWT_SECRETO'),
          configuracion.obtener('JWT_EXPIRACION'),
        ),
      inject: [ConfiguracionSistema],
    },
    {
      provide: UsuarioRepository,
      useFactory: (origen: DataSource) => new UsuarioPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: IniciarSesion,
      useFactory: (
        usuarios: UsuarioRepository,
        hasheador: HasheadorContrasena,
        emisor: EmisorTokens,
      ) => new IniciarSesion(usuarios, hasheador, emisor),
      inject: [UsuarioRepository, HasheadorContrasena, EmisorTokens],
    },
  ],
})
export class AccesoModule {}