import warnings
from io import BytesIO
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from lectura import Lectura, MotorLectura, MotorNoDisponible
from motor_fast_alpr import MotorFastAlpr

MAXIMO_BYTES = 5 * 1024 * 1024
MAXIMO_PIXELES = 20_000_000
FORMATOS = {"JPEG", "PNG", "WEBP"}


def abrir_imagen(datos: bytes) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(datos)) as original:
                if original.format not in FORMATOS:
                    raise HTTPException(415, "Usa una imagen JPEG, PNG o WebP")
                if original.width * original.height > MAXIMO_PIXELES:
                    raise HTTPException(413, "La imagen supera 20 millones de píxeles")
                original.load()
                return original.convert("RGB")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise HTTPException(413, "La imagen excede el límite de píxeles") from error
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(400, "El archivo no contiene una imagen válida") from error


def crear_app(motor: MotorLectura | None = None) -> FastAPI:
    servicio = FastAPI(title="CarQ LPR", version="0.1.0")
    lector = motor if motor is not None else MotorFastAlpr()

    @servicio.post(
        "/read",
        response_model=Lectura,
        responses={
            400: {"description": "Archivo vacío o imagen inválida"},
            413: {"description": "Imagen demasiado grande"},
            415: {"description": "Formato de imagen no admitido"},
            503: {"description": "Motor de lectura no disponible o fallido"},
        },
    )
    def leer(imagen: Annotated[UploadFile, File(description="Imagen JPEG, PNG o WebP; máximo 5 MiB")]) -> Lectura:
        try:
            datos = imagen.file.read(MAXIMO_BYTES + 1)
            if len(datos) > MAXIMO_BYTES:
                raise HTTPException(413, "La imagen supera 5 MiB")
            if not datos:
                raise HTTPException(400, "La imagen está vacía")
            with abrir_imagen(datos) as decodificada:
                try:
                    return Lectura.model_validate(lector.leer(decodificada))
                except MotorNoDisponible as error:
                    raise HTTPException(503, "El motor de lectura no está disponible") from error
                except Exception as error:
                    # No exponer imágenes, placas, rutas ni detalles del motor en el error.
                    raise HTTPException(503, "No fue posible completar la lectura") from error
        finally:
            imagen.file.close()

    return servicio


app = crear_app()
