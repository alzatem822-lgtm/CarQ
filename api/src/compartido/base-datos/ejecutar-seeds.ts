import origen from './origen-datos';
import { sembrarSedeYCarril } from './seeds/sede-carril.seed';

const seeds = [sembrarSedeYCarril];

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