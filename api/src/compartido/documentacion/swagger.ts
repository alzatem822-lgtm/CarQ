import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function crearDocumentoOpenApi(app: INestApplication) {
  const configuracion = new DocumentBuilder()
    .setTitle('CarQ · API de parqueadero')
    .setVersion('0.0.1')
    .setDescription(
      'API implementada de autenticación y configuración para una sede.\n\n**Recorrido:** ejecuta POST /auth/login, copia `token` y pégalo en **Authorize** sin escribir el prefijo Bearer. Después consulta o actualiza la configuración con una cuenta ADMINISTRADOR. Un OPERADOR puede iniciar sesión pero recibe 403 en configuración.\n\nLos errores usan `{codigo,motivo}`. Los valores enviados en PUT se guardan realmente en la base configurada. Las tarifas se expresan en pesos colombianos enteros. Carril, cobros, pagos y consulta operativa todavía no tienen endpoints publicados.',
    )
    .addTag('Autenticación', 'Inicio de sesión y emisión del token JWT.')
    .addTag('Caja', 'Consulta de cobros y registro de pagos para operadores.')
    .addTag('Cupos', 'Capacidad máxima por tipo, no ocupación actual.')
    .addTag('Umbral', 'Confianza mínima configurada para las lecturas.')
    .addTag(
      'Tarifas y horario',
      'Tarifas por tipo y franja y delimitación del horario diurno.',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token obtenido en POST /auth/login. Introduce solo el token.',
      },
      'sesion',
    )
    .addServer('/', 'Mismo origen que sirve esta documentación')
    .build();
  const documento = SwaggerModule.createDocument(app, configuracion);
  // El pipe global rechaza propiedades extra: el contrato de entrada lo refleja.
  for (const nombre of [
    'InicioSesionDto',
    'ActualizarCuposDto',
    'CupoDto',
    'ActualizarUmbralDto',
    'ActualizarTarifasDto',
    'TarifaDto',
    'ActualizarFranjaDto',
  ]) {
    const esquema = documento.components?.schemas?.[nombre];
    if (esquema && !('$ref' in esquema)) esquema.additionalProperties = false;
  }
  return documento;
}

export function configurarSwagger(app: INestApplication) {
  const documento = crearDocumentoOpenApi(app);
  SwaggerModule.setup('docs', app, documento, {
    jsonDocumentUrl: '/docs-json',
    yamlDocumentUrl: '/docs-yaml',
    customSiteTitle: 'CarQ · Documentación API',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
      docExpansion: 'list',
      tagsSorter: 'alpha',
      validatorUrl: null,
    },
  });
  return documento;
}
