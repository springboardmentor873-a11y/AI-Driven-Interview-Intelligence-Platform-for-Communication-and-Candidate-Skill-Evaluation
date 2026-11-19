import { useEffect, useRef } from "react";

export default function CameraPreview({ stream, level = 0, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.srcObject = stream || null;
  }, [stream]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black ${className}`}>
      <div className="relative aspect-video">
        {stream ? (
          // Muted so you do not hear yourself; mirrored like a mirror
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/40">Camera is off</div>
        )}
      </div>
      <div className="flex items-center gap-3 bg-surface px-4 py-3 text-xs text-white/60">
        <span>Mic</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-green-400 transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
