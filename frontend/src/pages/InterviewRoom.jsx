import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import Shell from '../components/Shell'
import InterviewIntro from '../components/InterviewIntro'
import InterviewSummary from '../components/InterviewSummary'
import VoiceRecorder from '../components/VoiceRecorder'
import { categoryLabel, difficultyLabel } from '../labels'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const ghostButton =
  'rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper disabled:opacity-50'

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function InterviewRoom() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [index, setIndex] = useState(0)
  const [drafts, setDrafts] = useState({}) // typed text, kept only in memory
  const [recordings, setRecordings] = useState({}) // voice recordings, kept only in memory
  const [remaining, setRemaining] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const deadlineRef = useRef(0)
  const finishingRef = useRef(false)
  const autoFinishRef = useRef(() => {})
  const recordingsRef = useRef({})

  // The server tells us how many seconds are left. We count down from there.
  const applySession = useCallback((data) => {
    setSession(data)
    if (data.status === 'in_progress') {
      deadlineRef.current = Date.now() + data.seconds_left * 1000
      setRemaining(data.seconds_left)
    }
  }, [])

  // Load the interview
  useEffect(() => {
    api
      .get(`/interviews/${id}/`)
      .then((res) => {
        applySession(res.data)
        const firstOpen = res.data.questions.findIndex((q) => !q.answered)
        setIndex(firstOpen === -1 ? 0 : firstOpen)
      })
      .catch((err) =>
        setLoadError(err.response?.status === 404 ? 'We could not find this interview.' : errorText(err))
      )
  }, [id, applySession])

  // Countdown. When it reaches zero the interview finishes by itself.
  const status = session?.status
  useEffect(() => {
    if (status !== 'in_progress') return
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        clearInterval(timer)
        autoFinishRef.current()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [status])

  // Keep a copy of the recordings so we can free them when the page closes.
  useEffect(() => {
    recordingsRef.current = recordings
  }, [recordings])
  useEffect(
    () => () => Object.values(recordingsRef.current).forEach((r) => URL.revokeObjectURL(r.url)),
    []
  )

  const questions = session?.questions || []
  const question = questions[index]
  const answeredCount = questions.filter((q) => q.answered).length
  const unanswered = questions.length - answeredCount
  const timeIsUp = remaining === 0

  const setDraft = (questionId, text) => setDrafts((d) => ({ ...d, [questionId]: text }))
  const keepRecording = (questionId) => (rec) => setRecordings((r) => ({ ...r, [questionId]: rec }))
  const dropRecording = (questionId) => {
    const rec = recordings[questionId]
    if (rec) URL.revokeObjectURL(rec.url)
    setRecordings((all) => {
      const copy = { ...all }
      delete copy[questionId]
      return copy
    })
  }
  const goTo = (i) => {
    setIndex(i)
    setError('')
    setConfirming(false)
  }

  const begin = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/interviews/${id}/start/`)
      applySession(data)
    } catch (err) {
      setError(errorText(err, 'We could not start the interview.'))
    } finally {
      setBusy(false)
    }
  }

  const saveAnswer = async (q) => {
    const text = (drafts[q.id] || '').trim()
    const rec = recordings[q.id]
    if (!text && !rec) {
      setError('Write an answer or record one first.')
      return false
    }
    if (rec && rec.blob.size > MAX_AUDIO_BYTES) {
      setError('This recording is larger than 10 MB. Please discard it and record a shorter one.')
      return false
    }
    const body = new FormData()
    body.append('question_id', q.id)
    body.append('text_answer', text)
    if (rec) {
      body.append('audio_file', rec.blob, 'answer.webm')
      body.append('duration_seconds', rec.seconds)
    }
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post(`/interviews/${id}/answers/`, body)
      setSession((s) => ({ ...s, questions: s.questions.map((item) => (item.id === data.id ? data : item)) }))
      dropRecording(q.id)
      return true
    } catch (err) {
      setError(errorText(err, 'We could not save your answer.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const finish = async (auto = false) => {
    if (finishingRef.current) return
    finishingRef.current = true
    setBusy(true)
    setError('')
    setConfirming(false)
    try {
      // When time runs out, try to keep what is typed in the current question.
      if (auto && question && !question.answered) await saveAnswer(question)
      const { data } = await api.post(`/interviews/${id}/complete/`)
      applySession(data)
      setError('')
    } catch (err) {
      setError(errorText(err, 'We could not finish the interview. Please press Finish again.'))
      finishingRef.current = false
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    autoFinishRef.current = () => finish(true)
  })

  const askToFinish = () => {
    if (unanswered > 0) setConfirming(true)
    else finish()
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
        <InterviewIntro session={session} busy={busy} error={error} onBegin={begin} />
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

  const unsavedCount = questions.filter(
    (q) => !q.answered && ((drafts[q.id] || '').trim() || recordings[q.id])
  ).length

  const timer = (
    <span
      role='timer'
      className={`rounded-full px-5 py-2 font-display text-2xl font-semibold ${
        remaining <= 60 ? 'bg-clay text-paper' : 'bg-ink text-paper'
      }`}
    >
      {clock(remaining ?? 0)}
    </span>
  )

  return (
    <Shell title={title} subtitle={subtitle} actions={timer}>
      <div className='max-w-3xl space-y-6'>
        <div className='flex flex-wrap gap-2' aria-label='Questions'>
          {questions.map((q, i) => (
            <button
              key={q.id}
              type='button'
              onClick={() => goTo(i)}
              aria-label={`Question ${i + 1}${q.answered ? ', answered' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
                q.answered ? 'bg-moss text-paper' : 'bg-sand text-ink'
              } ${i === index ? 'ring-2 ring-saffron ring-offset-2 ring-offset-paper' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {timeIsUp && (
          <p className='rounded-xl bg-saffron/30 px-4 py-3 text-sm font-semibold'>Time is up. Finishing your interview...</p>
        )}

        <div className='space-y-5 rounded-3xl bg-white/70 p-7'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-ink/50'>
              Question {index + 1} of {questions.length}
            </p>
            <h2 className='mt-2 font-display text-2xl font-semibold leading-snug'>{question.question_text}</h2>
          </div>

          <div>
            <label htmlFor='answer' className='mb-1.5 block text-sm font-semibold'>
              Your answer
            </label>
            <textarea
              id='answer'
              rows={8}
              maxLength={10000}
              className='field resize-y'
              disabled={question.answered || timeIsUp}
              value={question.answered ? question.answer_text : drafts[question.id] || ''}
              onChange={(e) => setDraft(question.id, e.target.value)}
              placeholder='Type your answer here...'
            />
            {question.answered && (
              <p className='mt-2 text-sm font-semibold text-moss'>
                Answer saved{question.has_audio ? ' with a voice recording' : ''}. It cannot be changed.
              </p>
            )}
          </div>

          {!question.answered && (
            <VoiceRecorder
              key={question.id}
              disabled={busy || timeIsUp}
              recorded={recordings[question.id]}
              onRecorded={keepRecording(question.id)}
              onDiscard={() => dropRecording(question.id)}
            />
          )}

          {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

          <div className='flex flex-wrap items-center gap-3'>
            <button type='button' onClick={() => goTo(index - 1)} disabled={index === 0} className={ghostButton}>
              Previous
            </button>
            <button
              type='button'
              onClick={() => goTo(index + 1)}
              disabled={index === questions.length - 1}
              className={ghostButton}
            >
              Next
            </button>
            {!question.answered && (
              <button
                type='button'
                onClick={() => saveAnswer(question)}
                disabled={busy || timeIsUp}
                className='btn-primary sm:ml-auto'
              >
                {busy ? 'Saving...' : 'Save answer'}
              </button>
            )}
          </div>
          {!question.answered && (
            <p className='text-xs text-ink/55'>Once you save an answer it cannot be changed.</p>
          )}
        </div>

        <div className='rounded-3xl bg-sand/70 p-6'>
          <p className='text-sm text-ink/70'>
            {answeredCount} of {questions.length} answers saved.
          </p>

          {confirming ? (
            <div className='mt-4 space-y-3'>
              <p className='text-sm font-semibold'>
                {unanswered === 1 ? '1 question is' : `${unanswered} questions are`} still unanswered.
                {unsavedCount > 0 && ` ${unsavedCount} of them have text or a recording that is not saved yet.`} Finish
                anyway?
              </p>
              <div className='flex flex-wrap gap-3'>
                <button type='button' onClick={() => finish()} disabled={busy} className='btn-primary'>
                  Yes, finish
                </button>
                <button type='button' onClick={() => setConfirming(false)} className={ghostButton}>
                  Keep working
                </button>
              </div>
            </div>
          ) : (
            <button type='button' onClick={askToFinish} disabled={busy} className={`${ghostButton} mt-4`}>
              Finish interview
            </button>
          )}
        </div>
      </div>
    </Shell>
  )
}
