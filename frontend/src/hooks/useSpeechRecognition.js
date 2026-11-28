import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const SPEECH_RECOGNITION_SUPPORTED = Boolean(SpeechRecognitionClass)

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was blocked, so we cannot listen. You can still type your answer.',
  'no-speech': 'We could not hear anything. Check your microphone, or keep typing.',
  'audio-capture': 'No microphone was found. You can still type your answer.',
  network: 'The speech service could not be reached. You can still type your answer.',
}

// Speech-to-text for ONE question. When `autoStart` is true (speech recognition is
// supported and the camera/microphone are already allowed) it starts listening by
// itself as soon as the question appears. Either way, the candidate can pause or
// resume it afterwards with the mic button. While it is on, it restarts itself if the
// browser stops it (silence, internal limits) and calls onResult(text) with the
// growing transcript (final + interim) every time it changes. Always stops for good
// when the component using it unmounts (the question ended, or the candidate left
// the page).
export default function useSpeechRecognition({ onResult, autoStart = false }) {
  const [listening, setListening] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const shouldRunRef = useRef(false)

  const startRecognition = useCallback(() => {
    if (!SPEECH_RECOGNITION_SUPPORTED) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    // All state updates happen inside these event callbacks (asynchronous, fired by
    // the browser) rather than right after calling start() - start() only asks the
    // browser to begin, it does not mean listening has begun yet.
    recognition.onstart = () => {
      setListening(true)
      setErrorMessage('')
    }
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTextRef.current += transcript
        else interim += transcript
      }
      onResult(`${finalTextRef.current}${interim}`)
    }
    recognition.onerror = (event) => {
      // 'aborted' is what the browser reports when WE stop it on purpose (pause,
      // moving to the next question, pausing to restart) - not a real problem.
      if (event.error === 'aborted') return
      setErrorMessage(ERROR_MESSAGES[event.error] || 'Listening stopped unexpectedly. You can still type your answer.')
    }
    recognition.onend = () => {
      setListening(false)
      // The browser stops listening after a while (silence, internal time limits).
      // Restart automatically unless the candidate paused it.
      if (shouldRunRef.current) {
        try {
          recognition.start()
        } catch {
          // a stray double-start; leave it stopped rather than loop forever
        }
      }
    }

    try {
      recognition.start()
    } catch {
      setErrorMessage('We could not start listening. You can still type your answer.')
      return
    }
    recognitionRef.current = recognition
  }, [onResult])

  // Turned on and off by the mic button (pause/resume), and also by auto-start below.
  const start = useCallback(() => {
    shouldRunRef.current = true
    startRecognition()
  }, [startRecognition])

  const stop = useCallback(() => {
    shouldRunRef.current = false
    recognitionRef.current?.stop()
  }, [])

  const toggle = useCallback(() => {
    if (shouldRunRef.current) stop()
    else start()
  }, [start, stop])

  // Lets the editable answer box become the new baseline, so speech recognised
  // after a manual edit appends onto what the candidate typed instead of replacing it.
  const setBaseText = useCallback((text) => {
    finalTextRef.current = text
  }, [])

  // Start listening by itself, once, when the question appears - but only if speech
  // recognition is supported and the camera/microphone are already allowed (autoStart).
  // Deferred with setTimeout so that React StrictMode's dev-only double-invoke of
  // effects (mount -> cleanup -> mount) cancels the first, never-fired attempt via
  // clearTimeout instead of leaving two recognisers running at once.
  useEffect(() => {
    if (!autoStart || !SPEECH_RECOGNITION_SUPPORTED) return undefined
    shouldRunRef.current = true
    const timer = setTimeout(startRecognition, 0)
    return () => {
      clearTimeout(timer)
      shouldRunRef.current = false
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [autoStart, startRecognition])

  // Stop for good when this component unmounts (the question ended, or the candidate
  // left the page) - covers a manual start too, not just the automatic one above.
  useEffect(() => () => {
    shouldRunRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  return { listening, errorMessage, start, stop, toggle, setBaseText, supported: SPEECH_RECOGNITION_SUPPORTED }
}
