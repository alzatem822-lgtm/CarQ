from types import SimpleNamespace
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app import crear_app
from motor_fast_alpr import MotorFastAlpr
from test_app import imagen_prueba


def prediccion(texto="ABC123", confianza=0.9):
    return SimpleNamespace(ocr=SimpleNamespace(text=texto, confidence=confianza))


def test_convierte_rgb_a_bgr_y_reutiliza_modelo_cpu(monkeypatch):
    creaciones = []
    class Modelo:
        def predict(self, imagen):
            assert imagen.dtype == np.uint8
            assert imagen.flags.c_contiguous
            assert imagen[0, 0].tolist() == [0, 0, 255]
            return [prediccion(" abc-123 ", [0.9, 0.7, 0.8])]
    monkeypatch.setattr("motor_fast_alpr.crear_modelo", lambda: creaciones.append(1) or Modelo())
    motor = MotorFastAlpr()
    with Image.new("RGB", (16, 16), "red") as imagen:
        for _ in range(2):
            assert motor.leer(imagen).model_dump() == {"placa": "ABC123", "confianza": 0.7}
    assert len(creaciones) == 1


def test_inicializa_una_sola_vez_con_peticiones_concurrentes(monkeypatch):
    creaciones = []
    class Modelo:
        def predict(self, imagen):
            return []
    monkeypatch.setattr("motor_fast_alpr.crear_modelo", lambda: creaciones.append(1) or Modelo())
    motor = MotorFastAlpr()
    def leer(_):
        with Image.new("RGB", (16, 16)) as imagen:
            return motor.leer(imagen).placa
    with ThreadPoolExecutor(max_workers=4) as ejecutor:
        assert list(ejecutor.map(leer, range(8))) == [None] * 8
    assert creaciones == [1]


def test_sin_ocr_o_con_varias_placas_no_inventa_lectura(monkeypatch):
    class Modelo:
        resultados = []
        def predict(self, imagen):
            return self.resultados
    modelo = Modelo()
    monkeypatch.setattr("motor_fast_alpr.crear_modelo", lambda: modelo)
    motor = MotorFastAlpr()
    with Image.new("RGB", (16, 16)) as imagen:
        for resultados in [[], [SimpleNamespace(ocr=None)], [prediccion(" ")], [prediccion("ABC123"), prediccion("XYZ987")]]:
            modelo.resultados = resultados
            assert motor.leer(imagen).model_dump() == {"placa": None, "confianza": 0}


def test_modelo_real_configurado_exclusivamente_para_cpu(monkeypatch):
    parametros = []
    monkeypatch.setattr("fast_alpr.ALPR", lambda **kwargs: parametros.append(kwargs))
    from motor_fast_alpr import crear_modelo
    crear_modelo()
    assert parametros[0]["ocr_device"] == "cpu"
    assert parametros[0]["detector_providers"] == ["CPUExecutionProvider"]
    assert parametros[0]["ocr_providers"] == ["CPUExecutionProvider"]


def test_endpoint_utiliza_el_motor_integrado(monkeypatch):
    modelo = SimpleNamespace(predict=lambda imagen: [prediccion("ABC123", [0.9, 0.6, 0.8])])
    monkeypatch.setattr("motor_fast_alpr.crear_modelo", lambda: modelo)
    with TestClient(crear_app()) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 200
    assert respuesta.json() == {"placa": "ABC123", "confianza": 0.6}
