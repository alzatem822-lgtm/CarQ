import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'CarQ',
  description: 'Sistema de parqueadero con reconocimiento de placas',
};

const RUTAS = [
  { href: '/login', etiqueta: 'Login' },
  { href: '/carril', etiqueta: 'Carril' },
  { href: '/caja', etiqueta: 'Caja' },
  { href: '/administracion', etiqueta: 'Administración' },
  { href: '/consulta', etiqueta: 'Consulta' },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <nav style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
          {RUTAS.map((ruta) => (
            <Link key={ruta.href} href={ruta.href}>
              {ruta.etiqueta}
            </Link>
          ))}
        </nav>
        <main style={{ padding: '1rem' }}>{children}</main>
      </body>
    </html>
  );
}