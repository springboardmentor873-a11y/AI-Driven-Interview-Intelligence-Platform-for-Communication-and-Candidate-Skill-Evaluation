import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import Shell from '../components/Shell'
import InterviewIntro from '../components/InterviewIntro'
import InterviewSummary from '../components/InterviewSummary'
import ProgressDots from '../components/ProgressDots'
import QuestionPanel from '../components/QuestionPanel'
import useCameraMic from '../hooks/useCameraMic'
import { categoryLabel, difficultyLabel } from '../labels'

const UNRESOLVED_STATUSES = ['pending', 'active']

export default function InterviewRoom() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const media = useCameraMic()
  const stopMedia = media.stop

  // Load the interview. Also used to recover after a start/complete call fails.
  const loadSession = useCallback(
    () => api.get(`/interviews/${id}/`).then((res) => {
      setSession(res.data)
      setError('')
    }),
    [id]
  )

  useEffect(() => {
    loadSession().catch((err) =>
      setLoadError(err.response?.status === 404 ? 'We could not find this interview.' : errorText(err))
    )
  }, [loadSession])

  const status = session?.status
  const questions = useMemo(() => session?.questions || [], [session])
  // The one question the candidate should be working on: the first one that is
  // neither answered, skipped nor expired. Undefined once every question is resolved.
  const current = useMemo(() => questions.find((q) => UNRESOLVED_STATUSES.includes(q.status)), [questions])
  const currentId = current?.id
  // The question is only ready to show once the server has confirmed it is active
  // (and so reported a real seconds_left) - this is derived, not a separate state,
  // so there is nothing to set synchronously inside the effect below.
  const questionReady = current?.status === 'active'

  // Release the camera/microphone once the interview is over for any reason
  // (the hook itself also releases them when this page is left).
  useEffect(() => {
    if (status && status !== 'created' && status !== 'in_progress') stopMedia()
  }, [status, stopMedia])

  // Make sure the question the candidate is looking at is actually active on the
  // server (this also covers reloading the page mid-question: the server reports
  // the real time left, the browser's own clock is never trusted).
  useEffect(() => {
    if (status !== 'in_progress' || !currentId || questionReady) return
    let cancelled = false
    api
      .post(`/interviews/${id}/questions/${currentId}/start/`)
      .then(({ data }) => {
        if (!cancelled) setSession(data)
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, 'We could not load this question.'))
      })
    return () => {
      cancelled = true
    }
  }, [status, currentId, questionReady, id])

  // Once every question is resolved, complete the interview automatically.
  useEffect(() => {
    if (status !== 'in_progress' || current || questions.length === 0) return
    let cancelled = false
    api
      .post(`/interviews/${id}/complete/`)
      .then(({ data }) => {
        if (!cancelled) setSession(data)
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, 'We could not finish the interview.'))
      })
    return () => {
      cancelled = true
    }
  }, [status, current, questions.length, id])

  const begin = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/interviews/${id}/start/`)
      setSession(data)
    } catch (err) {
      setError(errorText(err, 'We could not start the interview.'))
    } finally {
      setBusy(false)
    }
  }

  // Passed down to QuestionPanel. Throws on failure so the panel can show its own
  // retry message without losing whatever the candidate typed.
  const saveAnswer = async (question, text, recording) => {
    const body = new FormData()
    body.append('question_id', question.id)
    body.append('text_answer', text)
    if (recording) body.append('audio_file', recording.blob, 'answer.webm')
    const { data } = await api.post(`/interviews/${id}/answers/`, body)
    setSession((s) => ({ ...s, questions: s.questions.map((q) => (q.id === data.id ? data : q)) }))
  }

  const skipQuestion = async (question) => {
    const { data } = await api.post(`/interviews/${id}/questions/${question.id}/skip/`)
    setSession(data)
  }

  // ----- what to show -----
  if (loadError) {
    return (
      <Shell title='Interview'>
        <p className='mb-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{loadError}</p>
        <Link to='/candidate' className='font-semibold text-moss underline underline-offset-4'>
          Back to dashboard
        </Link>
      </Shell>
    )
  }
  if (!session) {
    return (
      <Shell title='Interview'>
        <p className='text-ink/60'>Loading...</p>
      </Shell>
    )
  }

  const title = `${session.domain || categoryLabel[session.category]} interview`
  const subtitle = `${categoryLabel[session.category]}, ${difficultyLabel[session.difficulty]}, ${session.num_questions} questions`

  if (status === 'created') {
    return (
      <Shell title={title} subtitle={subtitle}>
        <InterviewIntro session={session} busy={busy} error={error} onBegin={begin} media={media} />
      </Shell>
    )
  }

  if (status !== 'in_progress') {
    return (
      <Shell title={title} subtitle={subtitle}>
        <InterviewSummary session={session} />
      </Shell>
    )
  }

  return (
    <Shell title={title} subtitle={subtitle}>
      <div className='space-y-6'>
        <ProgressDots questions={questions} currentId={currentId} />

        {media.state !== 'allowed' && (
          <div className='space-y-2 rounded-xl bg-saffron/20 px-4 py-3 text-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <span className='font-semibold'>Camera and microphone are off - Turn them on</span>
              <button
                type='button'
                onClick={media.request}
                disabled={media.state === 'requesting'}
                className='rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper transition hover:opacity-90 disabled:opacity-50'
              >
                {media.state === 'requesting' ? 'Requesting...' : 'Turn them on'}
              </button>
            </div>
            {media.state === 'denied' && (
              <p className='text-xs text-ink/70'>
                Access was blocked. Click the camera or lock icon in your browser's address bar, allow it for this
                site, then press Turn them on again.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>
            <p>{error}</p>
            <button
              type='button'
              onClick={() => loadSession().catch((err) => setError(errorText(err, 'We could not load this question.')))}
              className='mt-2 font-semibold underline underline-offset-4'
            >
              Try again
            </button>
          </div>
        )}

        {!current ? (
          <p className='text-ink/60'>Finishing your interview...</p>
        ) : !questionReady ? (
          <p className='text-ink/60'>Preparing your next question...</p>
        ) : (
          <QuestionPanel
            key={current.id}
            question={current}
            index={current.order_no - 1}
            total={questions.length}
            mediaStream={media.stream}
            onAnswer={saveAnswer}
            onSkip={skipQuestion}
          />
        )}
      </div>
    </Shell>
  )
}
