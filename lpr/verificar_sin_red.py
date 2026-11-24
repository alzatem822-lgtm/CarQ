"""Ejecutar en Docker con --network none para verificar arranque e inferencia HTTP."""

import http.client
import json
import subprocess
import sys
import time
from io import BytesIO

from PIL import Image


def main():
    servidor = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "app:app",
        "--host", "127.0.0.1", "--port", "8000",
    ])
    try:
        for _ in range(100):
            if servidor.poll() is not None:
                raise RuntimeError("El servicio no pudo arrancar")
            conexion = http.client.HTTPConnection("127.0.0.1", 8000, timeout=1)
            try:
                conexion.request("GET", "/openapi.json")
                respuesta = conexion.getresponse()
                assert respuesta.status == 200
                respuesta.read()
                break
            except (ConnectionError, OSError):
                time.sleep(0.1)
            finally:
                conexion.close()
        else:
            raise RuntimeError("El servicio no respondió a tiempo")

        buffer = BytesIO()
        with Image.new("RGB", (640, 480), "white") as imagen:
            imagen.save(buffer, "PNG")
        cuerpo = (
            b"--carq-prueba\r\n"
            b'Content-Disposition: form-data; name="imagen"; filename="sin-placa.png"\r\n'
            b"Content-Type: image/png\r\n\r\n" + buffer.getvalue() +
            b"\r\n--carq-prueba--\r\n"
        )
        conexion = http.client.HTTPConnection("127.0.0.1", 8000, timeout=60)
        try:
            conexion.request("POST", "/read", body=cuerpo, headers={
                "Content-Type": "multipart/form-data; boundary=carq-prueba",
            })
            respuesta = conexion.getresponse()
            assert respuesta.status == 200, f"Lectura fallida: HTTP {respuesta.status}"
            assert json.loads(respuesta.read()) == {"placa": None, "confianza": 0}
        finally:
            conexion.close()
        print("OK: servicio HTTP e inferencia real disponibles sin red externa")
    finally:
        servidor.terminate()
        try:
            servidor.wait(timeout=10)
        except subprocess.TimeoutExpired:
            servidor.kill()
            servidor.wait()


if __name__ == "__main__":
    main()
