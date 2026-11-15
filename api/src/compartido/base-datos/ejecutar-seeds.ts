import origen from './origen-datos';
import { sembrarCupos } from './seeds/cupos.seed';
import { sembrarSedeYCarril } from './seeds/sede-carril.seed';
import { sembrarUsuarios } from './seeds/usuarios.seed';

const seeds = [sembrarSedeYCarril, sembrarCupos, sembrarUsuarios];

async function ejecutar(): Promise<void> {
  await origen.initialize();
  try {
    for (const seed of seeds) {
      await seed(origen);
    }
  } finally {
    await origen.destroy();
  }
}

ejecutar().catch((error) => {
  console.error(error);
  process.exit(1);
});