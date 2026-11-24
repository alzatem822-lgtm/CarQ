import type { Redis } from 'ioredis';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { Placa } from '../../vehiculos/dominio/placa';
import { PaseVigenteRedisRepository } from './pase-vigente-redis.repository';

describe('PaseVigenteRedisRepository', () => {
  it('usa una clave por sede, placa y día, y caduca en el límite exclusivo', async () => {
    const venceEn = new Date('2026-11-20T11:00:00Z');
    const reloj = new RelojFijo(new Date(venceEn.getTime() - 1));
    const clave = {
      placa: Placa.crear('ABC123'),
      sedeId: 1,
      diaOperativo: '2026-11-19',
    };
    const texto = JSON.stringify({
      cobroId: 2,
      pagoId: 3,
      venceEn: venceEn.getTime(),
    });
    const get = jest.fn().mockResolvedValue(texto);
    const set = jest.fn().mockResolvedValue('OK');
    const redis = { status: 'ready', get, set } as unknown as Pick<
      Redis,
      'status' | 'get' | 'set'
    >;
    const repositorio = new PaseVigenteRedisRepository(redis, reloj);
    const pase = { ...clave, cobroId: 2, pagoId: 3, venceEn };

    await repositorio.guardar(pase);
    expect(set).toHaveBeenCalledWith(
      'carq:pase:1:ABC123:2026-11-19',
      texto,
      'PXAT',
      venceEn.getTime(),
    );
    await expect(repositorio.consultar(clave)).resolves.toEqual(pase);
    reloj.fijar(venceEn);
    await expect(repositorio.consultar(clave)).resolves.toBeNull();
  });
});
