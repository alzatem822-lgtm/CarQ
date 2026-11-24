import jwt from 'jsonwebtoken';
import { Rol } from '../dominio/rol';
import { EmisorJwt } from './emisor-jwt';

describe('EmisorJwt', () => {
  const emisor = new EmisorJwt('secreto-de-prueba', '1h');

  it('emite un token con usuario y rol', async () => {
    const token = await emisor.emitir({
      nombre: 'mariana',
      rol: Rol.ADMINISTRADOR,
    });
    const reclamaciones = jwt.decode(token) as jwt.JwtPayload;
    expect(reclamaciones.sub).toBe('mariana');
    expect(reclamaciones.rol).toBe('ADMINISTRADOR');
  });

  it('verifica un token válido y devuelve usuario y rol', async () => {
    const token = await emisor.emitir({ nombre: 'mariana', rol: Rol.OPERADOR });
    const payload = await emisor.verificar(token);
    expect(payload.nombre).toBe('mariana');
    expect(payload.rol).toBe(Rol.OPERADOR);
  });

  it('rechaza un token alterado', async () => {
    const token = await emisor.emitir({ nombre: 'mariana', rol: Rol.OPERADOR });
    const [cabecera, , firma] = token.split('.');
    const payloadFalso = Buffer.from(
      JSON.stringify({ sub: 'mariana', rol: 'ADMINISTRADOR' }),
    ).toString('base64url');
    const alterado = `${cabecera}.${payloadFalso}.${firma}`;
    await expect(emisor.verificar(alterado)).rejects.toThrow('inválido');
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const ajeno = new EmisorJwt('otro-secreto', '1h');
    const token = await ajeno.emitir({ nombre: 'mariana', rol: Rol.OPERADOR });
    await expect(emisor.verificar(token)).rejects.toThrow('inválido');
  });

  it('rechaza un token vencido', async () => {
    const vencido = new EmisorJwt('secreto-de-prueba', '-1s');
    const token = await vencido.emitir({
      nombre: 'mariana',
      rol: Rol.OPERADOR,
    });
    await expect(emisor.verificar(token)).rejects.toThrow('vencido');
  });
});