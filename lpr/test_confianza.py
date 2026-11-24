import pytest

from confianza import normalizar_confianza


@pytest.mark.parametrize("valor,esperado", [
    (0.8, 0.8), (0, 0), (1, 1),
    ([0.99, 0.31, 0.95], 0.31), ([0.9], 0.9),
    ([], 0), ([1, 0], 0),
    ([float("nan")], 0), ([float("inf")], 0),
    ([-1, 0.8], 0), ([1.1, 0.9], 0),
    (float("nan"), 0), (2, 0), (True, 0), ([True, 0.8], 0),
])
def test_normaliza_confianza_conservadora(valor, esperado):
    assert normalizar_confianza(valor) == esperado
