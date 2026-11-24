import math
from numbers import Real


def normalizar_confianza(valor: float | list[float]) -> float:
    """La confianza de una placa no supera la de su carácter menos seguro."""
    valores = valor if isinstance(valor, list) else [valor]
    if not valores:
        return 0.0
    if any(
        isinstance(item, bool)
        or not isinstance(item, Real)
        or not math.isfinite(item)
        or not 0 <= item <= 1
        for item in valores
    ):
        return 0.0
    return float(min(valores))
