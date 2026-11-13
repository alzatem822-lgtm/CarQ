export const RUTAS_CENSURADAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.contrasena',
  'req.body.token',
];

export const TEXTO_CENSURADO = '[CENSURADO]';