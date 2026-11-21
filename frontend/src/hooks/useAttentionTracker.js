import { useCallback, useEffect, useState } from "react";
import { AttentionTracker, analyzeFace } from "../utils/attention";

// MediaPipe's browser files. Both can be pointed at your own server with env variables
// (VITE_MEDIAPIPE_WASM_URL, VITE_FACE_MODEL_URL). Keep the version in sync with package.json.
const WASM_URL = import.meta.env.VITE_MEDIAPIPE_WASM_URL || "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL =
  import.meta.env.VITE_FACE_MODEL_URL ||
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const FRAME_MS = 200; // about 5 checks a second is plenty for eye contact and light on the computer

async function createLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    return FaceLandmarker.createFromOptions(fileset, options("CPU")); // some computers have no usable GPU path
  }
}

/**
 * Eye-contact tracking in the browser. The camera picture never leaves the computer: only the
 * summary numbers from snapshot() are sent with an answer.
 *
 *   status    "off" (no camera) | "loading" | "tracking" | "unavailable"
 *   state     what is seen right now: "contact" | "away" | "absent" | null
 *   snapshot()  numbers since the last reset (or null if too little was measured)
 *   reset()     start a new measurement window (one per question)
 *
 * If MediaPipe cannot load (offline, blocked) the status is "unavailable" and the interview
 * carries on without it.
 */
export default function useAttentionTracker(stream) {
  const [tracker] = useState(() => new AttentionTracker());
  const [status, setStatus] = useState("loading");
  const [state, setState] = useState(null);
  const hasCamera = Boolean(stream) && stream.getVideoTracks().length > 0;

  useEffect(() => {
    if (!hasCamera) return undefined;
    let cancelled = false;
    let timer = null;
    let landmarker = null;
    let lastState = null;
    let lastVideoTime = -1;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("aria-hidden", "true");
    Object.assign(video.style, { position: "fixed", width: "2px", height: "2px", opacity: "0", pointerEvents: "none", left: "0", top: "0" });
    document.body.appendChild(video);

    (async () => {
      try {
        landmarker = await createLandmarker();
        if (cancelled) return;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStatus("tracking");
        timer = setInterval(() => {
          if (document.hidden || video.readyState < 2 || video.currentTime === lastVideoTime) return;
          lastVideoTime = video.currentTime;
          let frame;
          try {
            frame = analyzeFace(landmarker.detectForVideo(video, performance.now()).faceLandmarks?.[0]);
          } catch {
            return; // one bad frame is not worth stopping for
          }
          const now = tracker.add(frame, performance.now());
          if (now !== lastState) {
            lastState = now;
            setState(now);
          }
        }, FRAME_MS);
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      video.srcObject = null;
      video.remove();
      try {
        landmarker?.close();
      } catch {
        /* already closed */
      }
    };
  }, [hasCamera, stream, tracker]);

  const snapshot = useCallback(() => tracker.snapshot(performance.now()), [tracker]);
  const reset = useCallback(() => tracker.reset(), [tracker]);

  return { status: hasCamera ? status : "off", state, snapshot, reset };
}
