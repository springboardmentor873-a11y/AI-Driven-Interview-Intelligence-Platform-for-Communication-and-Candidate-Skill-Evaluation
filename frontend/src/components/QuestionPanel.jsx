import { useEffect, useRef, useState } from 'react'
import { errorText } from '../api/errors'
import CameraPreview from './CameraPreview'
import VoiceRecorder from './VoiceRecorder'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

const primaryButton = 'btn-primary disabled:opacity-50'
const ghostButton =
  'rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper disabled:opacity-50'

// A small microphone glyph - avoids pulling in an icon library for one icon.
function MicIcon({ className = '' }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className}>
      <path strokeLinecap='round' strokeLinejoin='round' d='M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z' />
      <path strokeLinecap='round' strokeLinejoin='round' d='M19 11a7 7 0 0 1-14 0M12 18v3' />
    </svg>
  )
}

// One question, on screen for as long as it is active. Mounting this component IS
// "showing the question" - it is re-created (via its `key`) for every new question,
// which is what gives every question a fresh timer and a fresh speech-recognition session.
export default function QuestionPanel({ question, index, total, mediaStream, onAnswer, onSkip }) {
  const isLast = index === total - 1
  const [text, setText] = useState(question.answer_text || '')
  const [remaining, setRemaining] = useState(question.seconds_left ?? 0)
  const [recording, setRecording] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timedOutRef = useRef(false)
  const recordingRef = useRef(null)
  const textRef = useRef(text)

  const speech = useSpeechRecognition({ onResult: setText, autoStart: Boolean(mediaStream) })
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  useEffect(() => {
    textRef.current = text
  }, [text])
  useEffect(() => {
    recordingRef.current = recording
  }, [recording])
  // Free the recorded clip's memory if the candidate leaves without using it.
  useEffect(() => () => {
    if (recordingRef.current) URL.revokeObjectURL(recordingRef.current.url)
  }, [])

  const dropRecording = () => {
    if (recording) URL.revokeObjectURL(recording.url)
    setRecording(null)
  }

  const save = async () => {
    const rec = recordingRef.current
    if (!textRef.current.trim() && !rec) {
      setError('Write an answer, or record one, before saving.')
      return
    }
    if (rec && rec.blob.size > MAX_AUDIO_BYTES) {
      setError('This recording is larger than 10 MB. Please discard it and record a shorter one.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onAnswer(question, textRef.current.trim(), rec)
      if (mountedRef.current) dropRecording()
      else if (rec) URL.revokeObjectURL(rec.url)
    } catch (err) {
      if (mountedRef.current) setError(errorText(err, 'We could not save your answer. Please try again.'))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const skip = async () => {
    setBusy(true)
    setError('')
    try {
      await onSkip(question)
    } catch (err) {
      if (mountedRef.current) setError(errorText(err, 'We could not skip this question. Please try again.'))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  // The server is always the one that truly enforces the deadline (with a small grace
  // period). This countdown is only what the candidate sees; it starts from the time
  // left that the server reported when this question became active.
  useEffect(() => {
    const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remaining > 0 || timedOutRef.current) return
    timedOutRef.current = true
    speech.stop()
    if (textRef.current.trim()) save()
    else skip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  const handleTextChange = (e) => {
    const value = e.target.value
    setText(value)
    speech.setBaseText(value)
  }

  const handleSave = () => {
    speech.stop()
    save()
  }

  const handleSkip = () => {
    speech.stop()
    skip()
  }

  const low = remaining <= 15

  return (
    <div className='space-y-5 rounded-3xl bg-white/70 p-7'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-ink/50'>
          Question {index + 1} of {total}
        </p>
        <span
          role='timer'
          className={`rounded-full px-4 py-1.5 font-display text-xl font-semibold ${
            low ? 'bg-clay text-paper' : 'bg-ink text-paper'
          }`}
        >
          {clock(remaining)}
        </span>
      </div>

      <h2 className='font-display text-2xl font-semibold leading-snug'>{question.question_text}</h2>

      {mediaStream && <CameraPreview stream={mediaStream} className='max-w-lg' />}

      <div>
        <div className='mb-1.5 flex flex-wrap items-center justify-between gap-2'>
          <label htmlFor='answer' className='text-sm font-semibold'>
            Your answer
          </label>
          {speech.listening && (
            <span className='flex items-center gap-1.5 text-xs font-semibold text-moss'>
              <span className='h-2 w-2 animate-pulse rounded-full bg-moss' /> Listening...
            </span>
          )}
        </div>
        <div className='relative'>
          <textarea
            id='answer'
            rows={8}
            maxLength={10000}
            className='field resize-y pr-14'
            value={text}
            onChange={handleTextChange}
            placeholder={
              speech.supported ? 'Listening... you can also type or edit here.' : 'Type your answer here...'
            }
          />
          {speech.supported && (
            <button
              type='button'
              onClick={speech.toggle}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? 'Pause listening' : 'Resume listening'}
              title={speech.listening ? 'Pause listening' : 'Resume listening'}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full transition ${
                speech.listening
                  ? 'bg-clay text-paper animate-pulse'
                  : 'bg-sand text-ink hover:bg-moss hover:text-paper'
              }`}
            >
              <MicIcon className='h-5 w-5' />
            </button>
          )}
        </div>
        {!speech.supported && (
          <p className='mt-2 text-xs text-ink/55'>
            This browser cannot turn speech into text automatically. Please type your answer.
          </p>
        )}
        {speech.errorMessage && <p className='mt-2 text-xs text-clay'>{speech.errorMessage}</p>}
      </div>

      {/* Speech recognition already turns the microphone into text, so recording and
          uploading the raw audio too would be redundant - it only appears as a fallback
          for browsers that cannot do speech-to-text at all. */}
      {!speech.supported && (
        <VoiceRecorder
          disabled={busy}
          recorded={recording}
          onRecorded={setRecording}
          onDiscard={dropRecording}
        />
      )}

      {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

      <div className='flex flex-wrap items-center gap-3'>
        <button type='button' onClick={handleSkip} disabled={busy} className={ghostButton}>
          Skip
        </button>
        <button type='button' onClick={handleSave} disabled={busy} className={`${primaryButton} sm:ml-auto`}>
          {busy ? 'Saving...' : isLast ? 'Save and finish' : 'Save and next'}
        </button>
      </div>
      <p className='text-xs text-ink/55'>There is no going back once you save or skip this question.</p>
    </div>
  )
}
