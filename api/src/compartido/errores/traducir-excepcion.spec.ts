import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ErrorDominio } from './error-dominio';
import { traducirExcepcion } from './traducir-excepcion';

describe('traducirExcepcion', () => {
  it('traduce un ErrorDominio a 422 con su código y motivo', () => {
    const r = traducirExcepcion(new ErrorDominio('TARIFA_INVALIDA', 'Motivo X'));
    expect(r.estado).toBe(422);
    expect(r.cuerpo).toEqual({ codigo: 'TARIFA_INVALIDA', motivo: 'Motivo X' });
  });

  it('traduce una HttpException conservando su estado', () => {
    const r = traducirExcepcion(new NotFoundException('No existe'));
    expect(r.estado).toBe(404);
    expect(r.cuerpo).toEqual({ codigo: 'NOT_FOUND', motivo: 'No existe' });
  });

  it('une los mensajes de validación en un solo motivo', () => {
    const r = traducirExcepcion(
      new BadRequestException({ message: ['placa vacía', 'tipo inválido'] }),
    );
    expect(r.estado).toBe(400);
    expect(r.cuerpo.motivo).toBe('placa vacía; tipo inválido');
  });

  it('oculta el detalle de un error desconocido', () => {
    const r = traducirExcepcion(new Error('password=1234 en la línea 42'));
    expect(r.estado).toBe(500);
    expect(r.cuerpo.codigo).toBe('ERROR_INTERNO');
    expect(JSON.stringify(r.cuerpo)).not.toContain('1234');
  });
});