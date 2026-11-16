import type { Metadata } from 'next';
import { GuardiaDeRutas } from '@/componentes/GuardiaDeRutas';
import { Navegacion } from '@/componentes/Navegacion';
import './globals.css';

export const metadata: Metadata = {
  title: 'CarQ',
  description: 'Sistema de parqueadero con reconocimiento de placas',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Navegacion />
        <main style={{ padding: '1rem' }}>
          <GuardiaDeRutas>{children}</GuardiaDeRutas>
        </main>
      </body>
    </html>
  );
}