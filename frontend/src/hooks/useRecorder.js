import { useCallback, useEffect, useRef } from "react";

const VIDEO_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const CHUNK_MS = 5000; // hand data over every few seconds instead of holding one huge buffer

function begin(stream, types, options) {
  if (!window.MediaRecorder) return null;
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  try {
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), ...options });
    const item = { recorder, chunks: [], mimeType: recorder.mimeType || mimeType || "" };
    recorder.ondataavailable = (e) => {
      if (e.data?.size) item.chunks.push(e.data);
    };
    recorder.start(CHUNK_MS);
    return item;
  } catch {
    return null; // this browser cannot record; the interview still works
  }
}

function end(item) {
  return new Promise((resolve) => {
    if (!item) return resolve(null);
    const done = () => {
      const type = item.mimeType.split(";")[0];
      resolve(item.chunks.length ? new Blob(item.chunks, { type }) : null);
    };
    if (item.recorder.state === "inactive") return done();
    item.recorder.onstop = done;
    try {
      item.recorder.stop();
    } catch {
      done();
    }
  });
}

/** File extension for a recorded blob, matching what the server accepts. */
export function extensionFor(blob) {
  const type = blob.type;
  if (type.includes("mp4")) return type.startsWith("audio") ? "m4a" : "mp4";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Records the camera stream as one video file and the microphone as one small
 * audio file (used later for speech analysis). stop() resolves to
 * { video, audio } blobs, or null if nothing could be recorded.
 */
export default function useRecorder() {
  const itemsRef = useRef(null);

  const start = useCallback((stream) => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    itemsRef.current = {
      video: stream.getVideoTracks().length ? begin(stream, VIDEO_TYPES, { videoBitsPerSecond: 800000 }) : null,
      audio: audioTracks.length ? begin(new MediaStream(audioTracks), AUDIO_TYPES, { audioBitsPerSecond: 64000 }) : null,
    };
  }, []);

  const stop = useCallback(async () => {
    const items = itemsRef.current;
    itemsRef.current = null;
    if (!items) return null;
    const [video, audio] = await Promise.all([end(items.video), end(items.audio)]);
    return video || audio ? { video, audio } : null;
  }, []);

  useEffect(
    () => () => {
      // Leaving the page: stop recording and drop the data
      const items = itemsRef.current;
      itemsRef.current = null;
      [items?.video, items?.audio].forEach((item) => {
        if (item?.recorder.state !== "inactive") {
          try {
            item.recorder.stop();
          } catch {
            /* already stopped */
          }
        }
      });
    },
    [],
  );

  return { start, stop };
}
