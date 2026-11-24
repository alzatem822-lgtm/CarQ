from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError

from app import MAXIMO_BYTES, crear_app
from lectura import Lectura
import app as modulo_app


class MotorPrueba:
    def __init__(self, lectura: Lectura):
        self.lectura = lectura
        self.llamadas = 0

    def leer(self, imagen: Image.Image) -> Lectura:
        self.llamadas += 1
        assert imagen.mode == "RGB"
        assert imagen.size == (32, 16)
        return self.lectura


def imagen_prueba(formato="PNG"):
    datos = BytesIO()
    Image.new("RGB", (32, 16), "white").save(datos, formato)
    return datos.getvalue()


@pytest.mark.parametrize("formato", ["PNG", "JPEG", "WEBP"])
def test_responde_placa_y_confianza(formato):
    motor = MotorPrueba(Lectura(placa="ABC123", confianza=0.91))
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto", imagen_prueba(formato), "application/octet-stream")})
    assert respuesta.status_code == 200
    assert respuesta.json() == {"placa": "ABC123", "confianza": 0.91}
    assert motor.llamadas == 1


def test_sin_deteccion_no_inventa_placa():
    motor = MotorPrueba(Lectura(placa=None, confianza=0))
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 200
    assert respuesta.json() == {"placa": None, "confianza": 0}


@pytest.mark.parametrize("datos,estado", [
    (b"", 400),
    (b"esto no es una imagen", 400),
    (imagen_prueba()[:20], 400),
    (b"x" * (MAXIMO_BYTES + 1), 413),
    (imagen_prueba("GIF"), 415),
])
def test_rechaza_archivo_invalido_sin_invocar_motor(datos, estado):
    motor = MotorPrueba(Lectura(placa=None, confianza=0))
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.jpg", datos, "image/jpeg")})
    assert respuesta.status_code == estado
    assert motor.llamadas == 0


def test_rechaza_exceso_de_pixeles(monkeypatch):
    monkeypatch.setattr(modulo_app, "MAXIMO_PIXELES", 100)
    motor = MotorPrueba(Lectura(placa=None, confianza=0))
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 413
    assert motor.llamadas == 0


def test_exige_archivo_imagen():
    with TestClient(crear_app()) as cliente:
        assert cliente.post("/read").status_code == 422
        assert cliente.post("/read", json={"imagen": "foto.png"}).status_code == 422


def test_motor_no_disponible_no_se_confunde_con_ausencia_de_placa(monkeypatch):
    def fallar():
        raise RuntimeError("No hay modelos")
    monkeypatch.setattr("motor_fast_alpr.crear_modelo", fallar)
    with TestClient(crear_app()) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 503


@pytest.mark.parametrize("datos,estado", [(b"", 400), (b"no es imagen", 400), (b"x" * (MAXIMO_BYTES + 1), 413)])
def test_rechaza_archivo_invalido_sin_invocar_motor(datos, estado):
    motor = MotorPrueba(Lectura(placa=None, confianza=0))
    with TestClient(crear_app(motor)) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("falsa.jpg", datos, "image/jpeg")})
    assert respuesta.status_code == estado
    assert motor.llamadas == 0


def test_rechaza_formato_no_admitido():
    with TestClient(crear_app()) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.gif", imagen_prueba("GIF"))})
    assert respuesta.status_code == 415


def test_limita_pixeles_antes_de_invocar_motor(monkeypatch):
    monkeypatch.setattr("app.MAXIMO_PIXELES", 100)
    with TestClient(crear_app()) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 413


def test_exige_campo_imagen():
    with TestClient(crear_app()) as cliente:
        respuesta = cliente.post("/read", files={"archivo": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 422


def test_oculta_detalles_de_fallo_del_motor():
    class MotorFallido:
        def leer(self, imagen):
            raise RuntimeError("credencial-secreta y ABC123")

    with TestClient(crear_app(MotorFallido())) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 503
    assert "credencial" not in respuesta.text
    assert "ABC123" not in respuesta.text


def test_no_publica_una_respuesta_invalida_del_motor():
    class MotorIncoherente:
        def leer(self, imagen):
            return {"placa": "ABC123", "confianza": 8}

    with TestClient(crear_app(MotorIncoherente())) as cliente:
        respuesta = cliente.post("/read", files={"imagen": ("foto.png", imagen_prueba())})
    assert respuesta.status_code == 503


@pytest.mark.parametrize("placa,confianza", [(None, 0.4), ("", 1), ("   ", 1), ("ABC123", -1), ("ABC123", 2), ("ABC123", float("nan"))])
def test_contrato_rechaza_lecturas_incoherentes(placa, confianza):
    with pytest.raises(ValidationError):
        Lectura(placa=placa, confianza=confianza)


def test_openapi_publica_contrato_de_archivo_y_respuesta():
    documento = crear_app().openapi()
    operacion = documento["paths"]["/read"]["post"]
    assert "multipart/form-data" in operacion["requestBody"]["content"]
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/Lectura")
