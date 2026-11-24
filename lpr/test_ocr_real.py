"""Prueba optativa: LPR_IMAGEN_PRUEBA y LPR_PLACA_ESPERADA; requiere modelos."""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import crear_app
from motor_fast_alpr import MotorFastAlpr


@pytest.mark.skipif(not os.getenv("LPR_IMAGEN_PRUEBA"), reason="La inferencia real requiere una imagen de prueba explícita")
def test_lectura_real_por_http_y_ausencia_de_deteccion():
    ruta = Path(os.environ["LPR_IMAGEN_PRUEBA"])
    esperada = os.environ["LPR_PLACA_ESPERADA"]
    motor = MotorFastAlpr()
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": (ruta.name, ruta.read_bytes())})
        assert respuesta.status_code == 200
        lectura = respuesta.json()
        assert lectura["placa"] == esperada
        assert 0 < lectura["confianza"] <= 1
    with Image.new("RGB", (640, 480), "white") as vacia:
        assert motor.leer(vacia).model_dump() == {"placa": None, "confianza": 0}
