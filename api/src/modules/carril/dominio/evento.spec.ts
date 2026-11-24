import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Placa } from '../../vehiculos/dominio/placa';
import { DatosEvento, Evento } from './evento';

const datosBase: DatosEvento = {
  sedeId: '1',
  carrilId: '1',
  placa: Placa.crear('ABC123'),
  sentido: 'ENTRADA',
  resultado: 'AUTORIZADO',
  motivo: 'Ingreso autorizado',
  confianza: 0.95,
  origen: 'SIMULADO',
  lecturaManual: false,
  ocurridoEn: new Date('2026-11-17T15:00:00Z'),
};

describe('Evento', () => {
  it('guarda origen, resultado y motivo', () => {
    const evento = Evento.crear(datosBase);

    expect(evento.origen).toBe('SIMULADO');
    expect(evento.resultado).toBe('AUTORIZADO');
    expect(evento.motivo).toBe('Ingreso autorizado');
  });

  it('permite placa y confianza nulas cuando el lector no detecta nada', () => {
    const evento = Evento.crear({
      ...datosBase,
      placa: null,
      confianza: null,
      resultado: 'REQUIERE_LECTURA_MANUAL',
      motivo: 'No se detectó placa',
    });

    expect(evento.placa).toBeNull();
    expect(evento.confianza).toBeNull();
  });

  it('rechaza un motivo vacío', () => {
    expect(() => Evento.crear({ ...datosBase, motivo: '   ' })).toThrow(
      ErrorDominio,
    );
  });

  it.each([-0.1, 1.1])(
    'rechaza la confianza fuera de rango (%s)',
    (confianza) => {
      expect(() => Evento.crear({ ...datosBase, confianza })).toThrow(
        ErrorDominio,
      );
    },
  );
  it('conserva operador y marca manual al validar una placa', () => {
    const evento = Evento.crear({
      ...datosBase,
      origen: 'MANUAL',
      lecturaManual: true,
      operador: ' operador ',
    });
    expect(evento.operador).toBe('operador');
    expect(evento.lecturaManual).toBe(true);
  });
  it.each([undefined, null, '', '  ', 'x'.repeat(101)])(
    'rechaza evento manual sin identidad válida: %s',
    (operador) => {
      expect(() =>
        Evento.crear({
          ...datosBase,
          origen: 'MANUAL',
          lecturaManual: true,
          operador,
        }),
      ).toThrow('operador');
    },
  );
  it('exige operador aunque solo el origen o la marca indiquen lectura manual', () => {
    expect(() => Evento.crear({ ...datosBase, origen: 'MANUAL' })).toThrow(
      'operador',
    );
    expect(() => Evento.crear({ ...datosBase, lecturaManual: true })).toThrow(
      'operador',
    );
  });
  it('admite un evento automático sin operador', () => {
    expect(Evento.crear(datosBase).operador).toBeNull();
  });
});
