import { useEffect, useState } from "react";

/** Live microphone loudness from 0 to 1 for a stream, so people can see the mic works. */
export default function useAudioLevel(stream) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!stream || !Ctx || stream.getAudioTracks().length === 0) return undefined;

    const context = new Ctx();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
      setLevel(Math.min(1, peak / 64));
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      context.close().catch(() => {});
      setLevel(0);
    };
  }, [stream]);

  return level;
}
