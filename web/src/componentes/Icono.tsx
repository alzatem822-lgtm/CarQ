const trazos: Record<string, string> = {
  panel: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  ajustes: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  carril: 'M5 21V3 M19 21V3 M12 4v3 M12 11v3 M12 18v3',
  caja: 'M4 5h16v14H4z M4 10h16 M8 15h3',
  consulta: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  salir: 'M9 4H4v16h5 M13 8l4 4-4 4 M8 12h13',
  flecha: 'M5 12h14 M13 6l6 6-6 6',
  escudo: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  reloj: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  carro: 'M3 16V10l3-5h12l3 5v6z M3 10h18 M6 16v3 M18 16v3 M6 13h2 M16 13h2',
  llave: 'M14 5a5 5 0 1 1-4 8L4 19H1v-3l7-7a5 5 0 0 1 6-4',
};
export function Icono({ nombre, size = 20 }: { nombre: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[nombre] ?? trazos.panel} /></svg>;
}
