import { useCallback, useEffect, useRef, useState } from 'react'

// Manages ONE shared camera + microphone stream for the whole interview page,
// so the permission screen and the question screen can reuse the same stream
// instead of asking twice.
//
// state is one of:
//   'idle'        - permission not asked yet
//   'requesting'  - the browser's permission prompt is open
//   'allowed'     - both devices are working, `stream` is set
//   'denied'      - the user (or a past choice) blocked access
//   'no-device'   - no camera or microphone was found
//   'unsupported' - this browser has no getUserMedia API at all
//   'error'       - something else went wrong (device busy, track died, ...)
export default function useCameraMic() {
  const [state, setState] = useState('idle')
  const [stream, setStream] = useState(null)
  const [trackWarning, setTrackWarning] = useState('')
  const streamRef = useRef(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    streamRef.current = null
    setStream(null)
  }, [])

  const request = useCallback(async () => {
    setTrackWarning('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    setState('requesting')
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      newStream.getTracks().forEach((track) => {
        // The device can disappear mid-interview (unplugged, OS permission revoked, ...).
        track.onended = () => {
          setTrackWarning(`Your ${track.kind === 'video' ? 'camera' : 'microphone'} stopped working. Please try again.`)
          stop()
          setState('error')
        }
      })
      streamRef.current = newStream
      setStream(newStream)
      setState('allowed')
    } catch (err) {
      stop()
      if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(err.name)) {
        setState('denied')
      } else if (['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].includes(err.name)) {
        setState('no-device')
      } else {
        setState('error')
      }
    }
  }, [stop])

  // Always release the camera/microphone when the page is left.
  useEffect(() => stop, [stop])

  return { state, stream, trackWarning, request, stop }
}
