import type { ReactNode } from 'react';

interface PropiedadesSeccion {
  titulo: string;
  children: ReactNode;
}

export function SeccionAdministracion({
  titulo,
  children,
}: PropiedadesSeccion) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}