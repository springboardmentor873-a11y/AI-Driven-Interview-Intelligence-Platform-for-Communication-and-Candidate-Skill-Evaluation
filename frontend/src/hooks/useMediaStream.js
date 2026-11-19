import { useCallback, useEffect, useRef, useState } from "react";

function describe(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera or microphone access was blocked. Allow it in your browser's address bar, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found on this device.";
    case "NotReadableError":
      return "Your camera or microphone is being used by another app. Close it and try again.";
    default:
      return "Could not start your camera and microphone.";
  }
}

/** Asks for the camera and microphone and keeps the stream until stop() or unmount. */
export default function useMediaStream() {
  const [state, setState] = useState({ status: "idle", stream: null, message: "" });
  const streamRef = useRef(null);
  const aliveRef = useRef(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState((s) => (s.stream ? { status: "idle", stream: null, message: "" } : s));
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: "error", stream: null, message: "This browser cannot access a camera. Try Chrome, Edge or Firefox." });
      return;
    }
    setState({ status: "asking", stream: null, message: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop()); // page was left while the prompt was open
        return;
      }
      streamRef.current = stream;
      setState({ status: "ready", stream, message: "" });
    } catch (err) {
      if (aliveRef.current) setState({ status: "error", stream: null, message: describe(err) });
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { ...state, request, stop };
}
