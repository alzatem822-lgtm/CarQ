FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/lpr

WORKDIR /app

RUN groupadd --gid 10001 lpr \
    && useradd --uid 10001 --gid lpr --create-home lpr

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY app.py lectura.py confianza.py motor_fast_alpr.py precargar_modelos.py verificar_sin_red.py ./

# La construcción falla si los modelos no se pueden descargar o inicializar.
RUN python precargar_modelos.py \
    && chown -R lpr:lpr /home/lpr

USER lpr
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
