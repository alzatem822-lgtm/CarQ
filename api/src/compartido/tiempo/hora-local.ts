export class HoraLocal {
  private readonly formato: Intl.DateTimeFormat;

  constructor(zonaHoraria: string) {
    this.formato = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  }

  // La fecha UTC devuelta representa los componentes del reloj de pared.
  de(instante: Date): Date {
    const partes = Object.fromEntries(
      this.formato
        .formatToParts(instante)
        .map(({ type, value }) => [type, value]),
    );
    return new Date(
      `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}.000Z`,
    );
  }

  aInstante(horaDePared: Date): Date {
    const objetivo = horaDePared.getTime();
    const dosDias = 2 * 24 * 60 * 60 * 1000;
    const candidatos = [-dosDias, dosDias]
      .map((diferencia) => {
        const muestra = new Date(objetivo + diferencia);
        const desfase = this.de(muestra).getTime() - muestra.getTime();
        return new Date(objetivo - desfase);
      })
      .filter((instante) => this.de(instante).getTime() === objetivo)
      .sort((a, b) => a.getTime() - b.getTime());

    if (candidatos.length === 0) {
      throw new Error('El corte no existe en el horario local de la sede');
    }
    return candidatos[0];
  }
}
