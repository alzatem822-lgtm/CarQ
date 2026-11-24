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
        <GuardiaDeRutas>
          <Navegacion />
          <main id="contenido" className="contenido-app">
            {children}
          </main>
        </GuardiaDeRutas>
      </body>
    </html>
  );
}
