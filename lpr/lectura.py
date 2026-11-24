from typing import Protocol

from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Lectura(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, allow_inf_nan=False)

    placa: str | None = Field(min_length=1, max_length=32)
    confianza: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validar_ausencia(self) -> "Lectura":
        if self.placa is None and self.confianza != 0:
            raise ValueError("Una lectura sin placa debe tener confianza cero")
        if self.placa is not None and not self.placa.strip():
            raise ValueError("La placa no puede estar vacÃ­a")
        return self


class MotorNoDisponible(Exception):
    pass


class MotorLectura(Protocol):
    def leer(self, imagen: Image.Image) -> Lectura: ...
