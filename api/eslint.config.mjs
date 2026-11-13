// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Criterio de CARQ-1: el dominio es TypeScript puro
    files: ['src/modules/*/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'typeorm', '@prisma/*', 'pg', 'ioredis'],
              message: 'dominio/ es TypeScript puro.',
            },
            {
              group: [
                '**/aplicacion/**',
                '**/infraestructura/**',
                '**/adaptadores-entrada/**',
              ],
              message: 'dominio/ no depende de otras capas.',
            },
          ],
        },
      ],
    },
  },
  {
    // Criterio de CARQ-9: la hora solo se obtiene a través del puerto Reloj
    files: [
      'src/modules/*/dominio/**/*.ts',
      'src/modules/*/aplicacion/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Usa el puerto Reloj en lugar de new Date().',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Usa el puerto Reloj en lugar de Date.now().',
        },
      ],
    },
  },
);