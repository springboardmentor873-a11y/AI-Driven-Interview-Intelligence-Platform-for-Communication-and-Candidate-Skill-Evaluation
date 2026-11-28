import { Link } from 'react-router-dom'
import CameraPreview from './CameraPreview'
import MicLevelBar from './MicLevelBar'
import { categoryLabel, difficultyLabel } from '../labels'

const retryButton =
  'rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper'

// What to show for each camera/microphone permission state.
function PermissionGate({ media }) {
  const { state, stream, trackWarning, request } = media

  if (state === 'unsupported') {
    return (
      <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>
        This browser cannot use a camera or microphone. Please open this page in Google Chrome or Microsoft Edge.
      </p>
    )
  }

  if (state === 'allowed') {
    return (
      <div className='space-y-3'>
        <CameraPreview stream={stream} className='max-w-sm' />
        <div>
          <p className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50'>Microphone level</p>
          <MicLevelBar stream={stream} />
          <p className='mt-1 text-xs text-ink/55'>Say something out loud - the bar above should move.</p>
        </div>
        <p className='text-sm font-semibold text-moss'>Camera and microphone are ready.</p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className='space-y-3'>
        <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>
          Camera and microphone access was blocked. Click the camera or lock icon in your browser's address bar,
          allow access for this site, then press Try again.
        </p>
        <button type='button' onClick={request} className={retryButton}>
          Try again
        </button>
      </div>
    )
  }

  if (state === 'no-device') {
    return (
      <div className='space-y-3'>
        <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>
          No camera or microphone was found on this device. Please connect one and press Try again.
        </p>
        <button type='button' onClick={request} className={retryButton}>
          Try again
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className='space-y-3'>
        <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>
          {trackWarning || 'We could not access your camera or microphone. Another app might be using them.'}
        </p>
        <button type='button' onClick={request} className={retryButton}>
          Try again
        </button>
      </div>
    )
  }

  // state is 'idle' or 'requesting'
  return (
    <div className='space-y-3'>
      <ul className='list-disc space-y-1.5 pl-5 text-sm text-ink/80'>
        <li>Your camera is shown as a live preview only - the video is never recorded or uploaded.</li>
        <li>Your microphone turns your speech into text as you answer. You can always type instead.</li>
        <li>Converting speech to text may send your voice to your browser's own speech service over the internet.</li>
      </ul>
      <button type='button' onClick={request} disabled={state === 'requesting'} className='btn-primary'>
        {state === 'requesting' ? 'Requesting access...' : 'Allow camera and microphone'}
      </button>
    </div>
  )
}

// Shown before the interview starts (status: created). This is also the camera/microphone
// permission check - the Begin button stays disabled until both are allowed.
export default function InterviewIntro({ session, busy, error, onBegin, media }) {
  const facts = [
    ['Type', categoryLabel[session.category]],
    session.domain && ['Subject', session.domain],
    ['Difficulty', difficultyLabel[session.difficulty]],
    ['Questions', session.num_questions],
    ['Time per question', `${session.question_seconds / 60} minutes`],
  ].filter(Boolean)

  const ready = media.state === 'allowed'

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl bg-white/70 p-7'>
        <h2 className='font-display text-2xl font-semibold'>Your interview</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-3'>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className='text-xs font-semibold uppercase tracking-wide text-ink/50'>{label}</dt>
              <dd className='mt-0.5 font-semibold'>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className='rounded-3xl bg-sand/70 p-7'>
        <h2 className='font-display text-2xl font-semibold'>Before you begin</h2>
        <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-ink/80'>
          <li>Each question has its own timer, checked by the server.</li>
          <li>Once a question is answered or skipped, you cannot go back to change it.</li>
          <li>There is no going back to a previous question.</li>
        </ul>
      </div>

      <div className='rounded-3xl bg-white/70 p-7'>
        <h2 className='font-display text-2xl font-semibold'>Camera and microphone</h2>
        <div className='mt-4'>
          <PermissionGate media={media} />
        </div>
      </div>

      {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

      <div className='flex flex-wrap items-center gap-4'>
        <button onClick={onBegin} disabled={busy || !ready} className='btn-primary'>
          {busy ? 'Starting...' : 'Begin interview'}
        </button>
        {!ready && <p className='text-sm text-ink/55'>Allow your camera and microphone to begin.</p>}
        <Link to='/candidate' className='text-sm font-semibold text-moss underline underline-offset-4'>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
