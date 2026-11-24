"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { procesarImagenCarril } from "@/lib/carril";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import type { ControlOperacionCarril } from "@/lib/usar-operacion-carril";
import estilos from "./Carril.module.css";

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((pista) => pista.stop());
}

/** La cámara solo se solicita por acción del operador y nunca envía audio. */
export function CapturaCamara({
  sentido,
  vehiculoPresente,
  operacion: controlOperacion,
}: {
  sentido: "ENTRADA" | "SALIDA";
  vehiculoPresente: boolean | null;
  operacion: ControlOperacionCarril;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generacion = useRef(0);
  const solicitud = useRef<AbortController | null>(null);
  const ocupado = useRef(false);
  const presenciaAtendida = useRef(false);
  const [automatica, setAutomatica] = useState(false);
  const [fase, setFase] = useState<"apagada" | "solicitando" | "activa">(
    "apagada",
  );
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const operacion = sentido === "ENTRADA" ? "entrada" : "salida";

  // Un sondeo fallido (null) no equivale a que el vehículo abandonó el carril.
  const comprobarCapturaAutomatica = useEffectEvent(() => {
    if (vehiculoPresente === false) presenciaAtendida.current = false;
    if (controlOperacion.origen === "manual" && vehiculoPresente === true)
      presenciaAtendida.current = true;
    if (
      automatica &&
      vehiculoPresente === true &&
      fase === "activa" &&
      listo &&
      !ocupado.current &&
      !presenciaAtendida.current
    ) {
      void capturar();
    }
  });

  useEffect(() => {
    comprobarCapturaAutomatica();
  }, [
    vehiculoPresente,
    automatica,
    fase,
    listo,
    enviando,
    controlOperacion.origen,
  ]);

  useEffect(
    () => () => {
      generacion.current++;
      detener(stream.current);
      solicitud.current?.abort();
    },
    [],
  );

  function apagar() {
    generacion.current++;
    detener(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setListo(false);
    setFase("apagada");
  }

  async function activar() {
    if (fase !== "apagada") return;
    setError(null);
    setResultado(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "La cámara requiere localhost o HTTPS y un navegador compatible.",
      );
      return;
    }
    const intento = ++generacion.current;
    setFase("solicitando");
    try {
      const nuevo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      });
      if (intento !== generacion.current) {
        detener(nuevo);
        return;
      }
      stream.current = nuevo;
      nuevo.getVideoTracks().forEach((pista) =>
        pista.addEventListener(
          "ended",
          () => {
            if (intento === generacion.current) {
              apagar();
              setError("La cámara se desconectó. Actívala de nuevo.");
            }
          },
          { once: true },
        ),
      );
      if (!video.current) {
        detener(nuevo);
        return;
      }
      video.current.srcObject = nuevo;
      await video.current.play();
      if (intento !== generacion.current) return;
      setFase("activa");
    } catch (fallo) {
      if (intento !== generacion.current) return;
      apagar();
      const nombre = fallo instanceof DOMException ? fallo.name : "";
      setError(
        nombre === "NotAllowedError" || nombre === "SecurityError"
          ? "No hay permiso para usar la cámara. Autorízala en tu navegador e intenta de nuevo."
          : nombre === "NotFoundError"
            ? "No encontramos una cámara disponible."
            : "No pudimos iniciar la cámara. Comprueba que no esté ocupada e intenta de nuevo.",
      );
    }
  }

  async function capturar(imagenSeleccionada?: File) {
    const visor = video.current;
    if (ocupado.current) return;
    if (!imagenSeleccionada && (!visor || !listo || !stream.current?.active))
      return;
    if (!controlOperacion.iniciar("captura")) return;
    ocupado.current = true;
    // También cubre los envíos manuales para no duplicarlos automáticamente.
    if (vehiculoPresente === true) presenciaAtendida.current = true;
    const control = new AbortController();
    solicitud.current = control;
    const destino = sentido;
    const nombre = destino === "ENTRADA" ? "Entrada" : "Salida";
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      let imagen: Blob;
      if (imagenSeleccionada) {
        imagen = imagenSeleccionada;
      } else {
        if (!visor) throw new Error("Video no disponible");
        if (!visor.videoWidth || !visor.videoHeight)
          throw new Error("Fotograma no disponible");
        const lienzo = document.createElement("canvas");
        const escala = Math.min(
          1,
          1280 / Math.max(visor.videoWidth, visor.videoHeight),
        );
        lienzo.width = Math.round(visor.videoWidth * escala);
        lienzo.height = Math.round(visor.videoHeight * escala);
        const contexto = lienzo.getContext("2d");
        if (!contexto) throw new Error("No se pudo capturar");
        contexto.drawImage(visor, 0, 0, lienzo.width, lienzo.height);
        imagen = await new Promise<Blob>((resolver, rechazar) => {
          lienzo.toBlob(
            (blob) =>
              blob ? resolver(blob) : rechazar(new Error("Captura vacía")),
            "image/jpeg",
            0.85,
          );
        });
      }
      if (control.signal.aborted) return;
      const respuesta = await procesarImagenCarril(
        destino,
        imagen,
        AbortSignal.any([control.signal, AbortSignal.timeout(20000)]),
      );
      if (!control.signal.aborted)
        setResultado(`${nombre}: ${respuesta.motivo}`);
    } catch (fallo) {
      if (!control.signal.aborted)
        setError(
          mensajeDeErrorApi(
            fallo,
            `${nombre}: no pudimos confirmar el resultado. La operación pudo registrarse; revisa el estado del carril antes de repetirla.`,
          ),
        );
    } finally {
      controlOperacion.finalizar();
      ocupado.current = false;
      solicitud.current = null;
      if (!control.signal.aborted) setEnviando(false);
    }
  }

  return (
    <div className={estilos.capturaCamara} aria-busy={enviando}>
      <div className={estilos.visor}>
        <video
          ref={video}
          className={estilos.videoCamara}
          aria-label="Vista en vivo del carril"
          autoPlay
          muted
          playsInline
          hidden={fase === "apagada"}
          onLoadedData={() => setListo(true)}
          onEnded={() => {
            apagar();
            setError("La cámara se desconectó. Actívala de nuevo.");
          }}
        />
        {fase === "apagada" && (
          <p>Cámara apagada. Actívala para preparar una captura.</p>
        )}
        {fase === "solicitando" && (
          <p role="status">Esperando acceso a la cámara…</p>
        )}
      </div>
      <div className={estilos.controlesCamara}>
        {fase === "apagada" ? (
          <button
            type="button"
            className="boton-secundario"
            onClick={() => void activar()}
          >
            Activar cámara
          </button>
        ) : (
          <button
            type="button"
            className="boton-secundario"
            disabled={enviando}
            onClick={apagar}
          >
            Apagar cámara
          </button>
        )}
        <button
          type="button"
          className="boton-primario"
          disabled={
            fase !== "activa" || !listo || controlOperacion.origen !== null
          }
          onClick={() => void capturar()}
        >
          {enviando ? "Procesando captura…" : `Capturar ${operacion}`}
        </button>
      </div>
      <p className={estilos.nota}>
        La captura se enviará para {operacion}. El resultado aparecerá aquí y en
        el estado del carril.
      </p>
      <label className={estilos.capturaAutomatica}>
        <input
          type="checkbox"
          checked={automatica}
          onChange={(evento) => setAutomatica(evento.target.checked)}
          aria-describedby="ayuda-captura-automatica"
        />
        Captura automática al detectar vehículo
      </label>
      <p id="ayuda-captura-automatica" className={estilos.nota}>
        Con la cámara activa se enviará una captura de {operacion} por presencia
        detectada. Para una nueva captura automática, el sondeo debe confirmar
        primero que el carril quedó libre. Los errores no se reintentan
        automáticamente.
      </p>
      <div className={estilos.cargaImagen}>
        <label htmlFor="imagen-alternativa">Imagen alternativa</label>
        <p id="ayuda-imagen" className={estilos.nota}>
          Si no puedes usar la cámara, selecciona una imagen JPEG, PNG o WebP de
          hasta 5 MiB y confirma su envío.
        </p>
        <input
          id="imagen-alternativa"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="ayuda-imagen"
          disabled={controlOperacion.origen !== null}
          onChange={(evento) => {
            const seleccionado = evento.target.files?.[0] ?? null;
            setArchivo(null);
            setError(null);
            setResultado(null);
            if (!seleccionado) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(
                seleccionado.type,
              )
            ) {
              setError("Selecciona una imagen JPEG, PNG o WebP.");
              evento.target.value = "";
              return;
            }
            if (
              seleccionado.size === 0 ||
              seleccionado.size > 5 * 1024 * 1024
            ) {
              setError("La imagen debe contener datos y no superar 5 MiB.");
              evento.target.value = "";
              return;
            }
            setArchivo(seleccionado);
          }}
        />
        <button
          type="button"
          className="boton-secundario"
          disabled={!archivo || controlOperacion.origen !== null}
          onClick={() => archivo && void capturar(archivo)}
        >
          {enviando ? "Procesando imagen…" : `Enviar imagen para ${operacion}`}
        </button>
      </div>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      {resultado && <p role="status">{resultado}</p>}
    </div>
  );
}
