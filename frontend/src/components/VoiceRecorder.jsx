import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 300 // stop by itself after 5 minutes

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Records voice only after the user presses Record. Typing is always possible too.
// `recorded` is { blob, url, seconds } or null. The parent keeps it.
export default function VoiceRecorder({ disabled, recorded, onRecorded, onDiscard }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [problem, setProblem] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const chunksRef = useRef([])
  const cancelledRef = useRef(false)
  const secondsRef = useRef(0)

  const releaseMicrophone = () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // When the page is left (or the question changes) stop everything and free the microphone.
  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      releaseMicrophone()
    }
  }, [])

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }

  const start = async () => {
    setProblem('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setProblem('This browser cannot record audio. Please type your answer instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        releaseMicrophone()
        setRecording(false)
        if (cancelledRef.current || chunksRef.current.length === 0) return
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        onRecorded({ blob, url: URL.createObjectURL(blob), seconds: secondsRef.current })
      }
      recorderRef.current = recorder
      secondsRef.current = 0
      setSeconds(0)
      recorder.start()
      setRecording(true)
      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
        if (secondsRef.current >= MAX_SECONDS) stop()
      }, 1000)
    } catch {
      releaseMicrophone()
      setProblem('We could not use the microphone. Allow it in your browser, or type your answer instead.')
    }
  }

  return (
    <div className='rounded-2xl bg-sand/60 p-4'>
      <p className='mb-3 text-sm font-semibold'>
        Voice answer <span className='font-normal text-ink/60'>(optional, you can always type instead)</span>
      </p>

      {recording && (
        <div className='flex flex-wrap items-center gap-3'>
          <span className='flex items-center gap-2 rounded-full bg-clay px-3 py-1 text-sm font-semibold text-paper'>
            <span className='h-2.5 w-2.5 animate-pulse rounded-full bg-paper' />
            Recording {clock(seconds)}
          </span>
          <button type='button' onClick={stop} className='btn-primary'>
            Stop
          </button>
        </div>
      )}

      {!recording && recorded && (
        <div className='flex flex-wrap items-center gap-3'>
          <audio controls src={recorded.url} className='h-10 max-w-full' />
          <button
            type='button'
            onClick={onDiscard}
            disabled={disabled}
            className='rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium transition hover:bg-ink hover:text-paper disabled:opacity-50'
          >
            Discard
          </button>
        </div>
      )}

      {!recording && !recorded && (
        <button
          type='button'
          onClick={start}
          disabled={disabled}
          className='rounded-full border border-moss px-5 py-2 text-sm font-semibold text-moss transition hover:bg-moss hover:text-paper disabled:opacity-50'
        >
          Record
        </button>
      )}

      {problem && <p className='mt-3 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{problem}</p>}
    </div>
  )
}
