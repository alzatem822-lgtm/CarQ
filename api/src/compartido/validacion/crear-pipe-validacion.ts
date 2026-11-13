import { ValidationPipe } from '@nestjs/common';

export function crearPipeValidacion(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}