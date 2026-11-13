import { BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { traducirExcepcion } from '../errores/traducir-excepcion';
import { crearPipeValidacion } from './crear-pipe-validacion';

class DtoPrueba {
  @IsString()
  @IsNotEmpty()
  placa!: string;
}

describe('crearPipeValidacion', () => {
  const pipe = crearPipeValidacion();
  const metadatos = { type: 'body' as const, metatype: DtoPrueba };

  it('acepta un cuerpo válido', async () => {
    const resultado = await pipe.transform({ placa: 'ABC123' }, metadatos);
    expect(resultado).toEqual({ placa: 'ABC123' });
  });

  it('rechaza un cuerpo inválido con BadRequestException', async () => {
    await expect(pipe.transform({}, metadatos)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza los campos que el DTO no declara', async () => {
    await expect(
      pipe.transform({ placa: 'ABC123', extra: 1 }, metadatos),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 400 con el motivo del campo inválido', async () => {
    const error = await pipe.transform({}, metadatos).catch((e) => e);
    const respuesta = traducirExcepcion(error);
    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.motivo).toContain('placa');
  });
});