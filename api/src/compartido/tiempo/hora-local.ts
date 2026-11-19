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
}
