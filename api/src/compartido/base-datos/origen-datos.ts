import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.URL_BASE_DATOS_MIGRACIONES ?? process.env.URL_BASE_DATOS,
  migrations: [__dirname + '/migraciones/*.{ts,js}'],
});