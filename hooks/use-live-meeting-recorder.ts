"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TranscriptPayload = {
  text: string;
  isFinal: boolean;
  provider?: string;
  warning?: string;
};

type RecorderOptions = {
  meetingId: string;
  clientId: string;
  chunkIntervalMs?: number;
  onTranscript?: (payload: TranscriptPayload) => void;
  onError?: (error: Error, context?: Record<string, unknown>) => void;
};

type RecorderState = {
  isRecording: boolean;
  isStarting: boolean;
  audioLevel: number;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
};

const DEFAULT_CHUNK_INTERVAL_MS = 4500;
const MIN_CHUNK_INTERVAL_MS = 3000;
const MAX_CHUNK_INTERVAL_MS = 30000;
const SILENCE_THRESHOLD = 0.01;
const MAX_PCM_BUFFER_SECONDS = 45;
const MICROPHONE_TIMEOUT_MS = 12000;

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function floatTo16BitPcm(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
}

function createWavBlob(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPcm(view, 44, samples);

  return new Blob([view], { type: "audio/wav" });
}

function clampChunkInterval(value?: number) {
  if (!value || Number.isNaN(value)) return DEFAULT_CHUNK_INTERVAL_MS;
  return Math.max(MIN_CHUNK_INTERVAL_MS, Math.min(MAX_CHUNK_INTERVAL_MS, Math.round(value)));
}

function getAudioStreamWithTimeout(timeoutMs = MICROPHONE_TIMEOUT_MS) {
  return new Promise<MediaStream>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error("Microphone permission timed out.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (settled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(stream);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function readSseText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const payload = raw
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n")
        .trim();

      if (payload) {
        const event = JSON.parse(payload) as { text?: string; delta?: string; done?: boolean };
        if (event.done && typeof event.text === "string") {
          finalText = event.text;
        } else if (typeof event.delta === "string") {
          finalText += event.delta;
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  return finalText.trim();
}

export function useLiveMeetingRecorder(options: RecorderOptions): RecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const pcmBufferRef = useRef<Float32Array[]>([]);
  const sampleCountRef = useRef(0);
  const transcribeInFlightRef = useRef(false);
  const stoppedRef = useRef(true);

  const appendTranscript = useCallback(
    (text: string, provider = "openai") => {
      const clean = text.trim();
      if (!clean) return;
      setTranscript((current) => `${current} ${clean}`.trim());
      options.onTranscript?.({ text: clean, isFinal: true, provider });
    },
    [options]
  );

  const sendChunk = useCallback(
    async (blob: Blob, durationMs: number) => {
      if (transcribeInFlightRef.current || stoppedRef.current) return;
      transcribeInFlightRef.current = true;

      try {
        const formData = new FormData();
        formData.append("audio", new File([blob], `chunk-${Date.now()}.wav`, { type: "audio/wav" }));
        formData.append("clientId", options.clientId);
        formData.append("durationMs", String(Math.round(durationMs)));

        const response = await fetch(`/api/meetings/${options.meetingId}/transcribe`, {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `Transcription failed (${response.status})`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream")) {
          appendTranscript(await readSseText(response), "openai");
        } else {
          const data = (await response.json()) as { text?: string; warning?: string };
          if (data.warning) {
            options.onTranscript?.({ text: "", isFinal: true, provider: "demo", warning: data.warning });
          }
          appendTranscript(data.text ?? "", "openai");
        }
      } catch (caught) {
        const nextError = caught instanceof Error ? caught : new Error(String(caught));
        setError(nextError.message);
        options.onError?.(nextError, { source: "transcription" });
      } finally {
        transcribeInFlightRef.current = false;
      }
    },
    [appendTranscript, options]
  );

  const stopRecording = useCallback(async () => {
    stoppedRef.current = true;
    processorRef.current?.disconnect();
    processorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
    }
    audioContextRef.current = null;
    pcmBufferRef.current = [];
    sampleCountRef.current = 0;
    setAudioLevel(0);
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isStarting) return;
    setError(null);
    setIsStarting(true);

    try {
      const stream = await getAudioStreamWithTimeout();
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const mutedOutput = audioContext.createGain();
      const chunkIntervalMs = clampChunkInterval(options.chunkIntervalMs);

      mutedOutput.gain.value = 0;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      processorRef.current = processor;
      pcmBufferRef.current = [];
      sampleCountRef.current = 0;
      stoppedRef.current = false;

      source.connect(analyser);
      source.connect(processor);
      processor.connect(mutedOutput);
      mutedOutput.connect(audioContext.destination);

      const levelData = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteTimeDomainData(levelData);
        let sum = 0;
        for (const value of levelData) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        setAudioLevel(Math.min(1, Math.sqrt(sum / levelData.length) * 3));
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      processor.onaudioprocess = (event) => {
        if (stoppedRef.current) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        pcmBufferRef.current.push(chunk);
        sampleCountRef.current += chunk.length;

        const sampleRate = audioContext.sampleRate;
        const maxSamples = MAX_PCM_BUFFER_SECONDS * sampleRate;
        while (pcmBufferRef.current.length > 1 && sampleCountRef.current > maxSamples) {
          const dropped = pcmBufferRef.current.shift();
          sampleCountRef.current -= dropped?.length ?? 0;
        }

        const requiredSamples = (chunkIntervalMs / 1000) * sampleRate;
        if (sampleCountRef.current < requiredSamples || transcribeInFlightRef.current) return;

        const merged = new Float32Array(sampleCountRef.current);
        let offset = 0;
        for (const buffer of pcmBufferRef.current) {
          merged.set(buffer, offset);
          offset += buffer.length;
        }

        let sum = 0;
        for (const sample of merged) {
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / merged.length);
        const durationMs = (merged.length / sampleRate) * 1000;
        pcmBufferRef.current = [];
        sampleCountRef.current = 0;

        if (rms < SILENCE_THRESHOLD) return;
        void sendChunk(createWavBlob(merged, sampleRate), durationMs);
      };

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      setIsRecording(true);
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error(String(caught));
      setError(nextError.message);
      options.onError?.(nextError, { source: "microphone" });
      await stopRecording();
    } finally {
      setIsStarting(false);
    }
  }, [isRecording, isStarting, options, sendChunk, stopRecording]);

  useEffect(() => {
    return () => {
      void stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    isStarting,
    audioLevel,
    transcript,
    error,
    startRecording,
    stopRecording
  };
}
