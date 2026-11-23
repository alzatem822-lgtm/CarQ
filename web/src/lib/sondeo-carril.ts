import type { EstadoCarril } from "./carril";

/** Consulta al iniciar y cada segundo, sin solapar peticiones. */
export function iniciarSondeoCarril(
  consultar: (signal: AbortSignal) => Promise<EstadoCarril>,
  recibir: (estado: EstadoCarril) => void,
  fallar: (error: unknown) => void,
): () => void {
  const control = new AbortController();
  let activo = true;
  let consultando = false;

  async function actualizar() {
    if (!activo || consultando) return;
    consultando = true;
    try {
      const estado = await consultar(
        AbortSignal.any([control.signal, AbortSignal.timeout(5000)]),
      );
      if (activo) recibir(estado);
    } catch (error) {
      if (activo) fallar(error);
    } finally {
      consultando = false;
    }
  }

  const temporizador = setInterval(() => {
    void actualizar();
  }, 1000);
  void actualizar();
  return () => {
    activo = false;
    clearInterval(temporizador);
    control.abort();
  };
}
