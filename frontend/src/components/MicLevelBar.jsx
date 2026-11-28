import { useEffect, useRef, useState } from 'react'

// A simple live microphone level bar, built only from the browser's Web Audio API.
// Lets the candidate see their microphone is actually picking up sound.
export default function MicLevelBar({ stream }) {
  const [level, setLevel] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return undefined
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return undefined

    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      // Root-mean-square distance from silence (128 is the silent midpoint), as a 0-1 level.
      let sumSquares = 0
      for (let i = 0; i < data.length; i++) {
        const normalised = (data[i] - 128) / 128
        sumSquares += normalised * normalised
      }
      const rms = Math.sqrt(sumSquares / data.length)
      setLevel(Math.min(1, rms * 4))
      frameRef.current = requestAnimationFrame(tick)
    }
    // Scheduled via requestAnimationFrame (not called directly) so the first
    // setLevel() happens asynchronously, outside this effect's own render pass.
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameRef.current)
      source.disconnect()
      analyser.disconnect()
      audioContext.close()
    }
  }, [stream])

  const displayLevel = stream ? level : 0

  return (
    <div className='h-2 w-full overflow-hidden rounded-full bg-sand' role='meter' aria-label='Microphone level'>
      <div
        className='h-full rounded-full bg-moss transition-[width] duration-100'
        style={{ width: `${Math.round(displayLevel * 100)}%` }}
      />
    </div>
  )
}
