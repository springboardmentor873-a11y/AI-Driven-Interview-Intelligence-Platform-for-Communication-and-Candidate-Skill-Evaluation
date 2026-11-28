import { useEffect, useRef } from 'react'

// A small mirrored live preview of a camera stream. Video is never recorded or sent anywhere -
// this element only shows what the camera sees right now.
export default function CameraPreview({ stream, className = '' }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null
  }, [stream])

  if (!stream) return null

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className={`aspect-video w-full scale-x-[-1] rounded-2xl bg-ink object-cover ${className}`}
    />
  )
}
