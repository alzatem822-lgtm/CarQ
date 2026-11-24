import re
from threading import Lock
from typing import Any

import numpy as np
from PIL import Image, ImageOps

from confianza import normalizar_confianza
from lectura import Lectura, MotorNoDisponible

MODELO_DETECTOR = "yolo-v9-t-384-license-plate-end2end"
MODELO_OCR = "cct-xs-v2-global-model"


def crear_modelo() -> Any:
    from fast_alpr import ALPR

    return ALPR(
        detector_model=MODELO_DETECTOR,
        detector_providers=["CPUExecutionProvider"],
        ocr_model=MODELO_OCR,
        ocr_device="cpu",
        ocr_providers=["CPUExecutionProvider"],
    )


class MotorFastAlpr:
    def __init__(self):
        self._modelo = None
        self._bloqueo = Lock()

    def leer(self, imagen: Image.Image) -> Lectura:
        # Modelos compartidos entre peticiones; sin inicializaciones o inferencias simultáneas.
        with self._bloqueo:
            if self._modelo is None:
                try:
                    self._modelo = crear_modelo()
                except Exception as error:
                    raise MotorNoDisponible from error
            with ImageOps.exif_transpose(imagen) as orientada:
                rgb = np.asarray(orientada.convert("RGB"))
                bgr = np.ascontiguousarray(rgb[:, :, ::-1])
            resultados = self._modelo.predict(bgr)

        lecturas = []
        for resultado in resultados:
            ocr = resultado.ocr
            if ocr is None:
                continue
            placa = re.sub(r"[\s-]", "", ocr.text).upper()
            if not placa:
                continue
            lecturas.append(Lectura(
                placa=placa,
                confianza=normalizar_confianza(ocr.confidence),
            ))

        # No elegir arbitrariamente un vehículo si aparecen placas distintas.
        if len({lectura.placa for lectura in lecturas}) != 1:
            return Lectura(placa=None, confianza=0)
        return min(lecturas, key=lambda lectura: lectura.confianza)
