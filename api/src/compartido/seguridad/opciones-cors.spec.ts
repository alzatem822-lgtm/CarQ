import { crearOpcionesCors } from './opciones-cors';

type VerificadorOrigen = (
  origen: string | undefined,
  devolver: (error: Error | null, permitir?: boolean) => void,
) => void;

function esPermitido(origen: string | undefined): boolean | undefined {
  const { origin } = crearOpcionesCors('http://localhost:3000');
  let resultado: boolean | undefined;
  (origin as VerificadorOrigen)(origen, (_error, permitir) => {
    resultado = permitir;
  });
  return resultado;
}

describe('crearOpcionesCors', () => {
  it('permite el origen del web', () => {
    expect(esPermitido('http://localhost:3000')).toBe(true);
  });

  it('rechaza un origen distinto', () => {
    expect(esPermitido('http://sitio-malicioso.com')).toBe(false);
  });

  it('permite las peticiones sin cabecera Origin', () => {
    expect(esPermitido(undefined)).toBe(true);
  });
});