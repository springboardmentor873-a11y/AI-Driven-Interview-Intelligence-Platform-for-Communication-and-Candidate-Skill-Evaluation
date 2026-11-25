import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import Shell from '../components/Shell'
import { difficultyLabel } from '../labels'

const categories = [
  { key: 'hr', title: 'HR', text: 'Introductions, motivation and workplace questions.' },
  { key: 'technical', title: 'Technical', text: 'Questions on a subject or skill you choose.' },
  { key: 'behavioral', title: 'Behavioral', text: 'Tell stories about real situations you faced.' },
  { key: 'aptitude', title: 'Aptitude', text: 'Logic, numbers and reasoning puzzles.' },
]

const suggestedDomains = ['Python', 'Java', 'Web Development', 'JavaScript', 'SQL', 'Data Structures', 'React', 'Django']
const timeOptions = [5, 10, 15, 20, 30, 45, 60]

export default function NewInterview() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('hr')
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)
  const [minutes, setMinutes] = useState(15)
  const [resumeId, setResumeId] = useState('')
  const [resumes, setResumes] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Only resumes that were read successfully can be used.
  useEffect(() => {
    api
      .get('/resumes/')
      .then((r) => setResumes(r.data.filter((item) => item.status === 'parsed')))
      .catch(() => setResumes([]))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/interviews/', {
        category,
        domain: category === 'technical' ? domain.trim() : '',
        difficulty,
        num_questions: Number(count),
        time_limit_minutes: Number(minutes),
        resume: resumeId ? Number(resumeId) : null,
      })
      navigate(`/interview/${data.id}`)
    } catch (err) {
      setError(errorText(err, 'We could not create the interview.'))
      setBusy(false)
    }
  }

  return (
    <Shell
      title='New practice interview'
      subtitle='Choose what you want to practise. Your questions are prepared in a few seconds.'
      actions={
        <Link to='/candidate' className='text-sm font-semibold text-moss underline underline-offset-4'>
          Back to dashboard
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className='max-w-3xl space-y-8'>
        {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

        <section>
          <h2 className='mb-3 font-display text-2xl font-semibold'>Interview type</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            {categories.map((c) => (
              <button
                key={c.key}
                type='button'
                onClick={() => setCategory(c.key)}
                aria-pressed={category === c.key}
                className={`rounded-3xl p-5 text-left transition ${
                  category === c.key ? 'bg-moss text-paper' : 'bg-white/70 hover:bg-sand'
                }`}
              >
                <p className='font-display text-xl font-semibold'>{c.title}</p>
                <p className={`mt-1 text-sm ${category === c.key ? 'text-paper/80' : 'text-ink/60'}`}>{c.text}</p>
              </button>
            ))}
          </div>
        </section>

        {category === 'technical' && (
          <section>
            <label htmlFor='domain' className='mb-1.5 block text-sm font-semibold'>
              Domain or subject
            </label>
            <input
              id='domain'
              list='domain-list'
              value={domain}
              maxLength={100}
              onChange={(e) => setDomain(e.target.value)}
              placeholder='For example Python, SQL or React'
              className='field'
            />
            <datalist id='domain-list'>
              {suggestedDomains.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <p className='mt-1.5 text-xs text-ink/55'>Pick one from the list or type your own.</p>
          </section>
        )}

        <section>
          <h2 className='mb-3 font-display text-2xl font-semibold'>Difficulty</h2>
          <div className='flex flex-wrap gap-3'>
            {Object.entries(difficultyLabel).map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => setDifficulty(key)}
                aria-pressed={difficulty === key}
                className={`rounded-full px-6 py-2.5 font-semibold transition ${
                  difficulty === key ? 'bg-moss text-paper' : 'bg-white/70 hover:bg-sand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className='grid gap-5 sm:grid-cols-2'>
          <div>
            <label htmlFor='count' className='mb-1.5 block text-sm font-semibold'>
              Number of questions
            </label>
            <select id='count' value={count} onChange={(e) => setCount(e.target.value)} className='field'>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className='mt-1.5 text-xs text-ink/55'>HR, behavioral and aptitude sets have up to 7 questions.</p>
          </div>
          <div>
            <label htmlFor='minutes' className='mb-1.5 block text-sm font-semibold'>
              Time limit
            </label>
            <select id='minutes' value={minutes} onChange={(e) => setMinutes(e.target.value)} className='field'>
              {timeOptions.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <label htmlFor='resume' className='mb-1.5 block text-sm font-semibold'>
            Resume (optional)
          </label>
          <select id='resume' value={resumeId} onChange={(e) => setResumeId(e.target.value)} className='field'>
            <option value=''>No resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.original_name}
              </option>
            ))}
          </select>
          <p className='mt-1.5 text-xs text-ink/55'>
            Technical interviews use the skills found in your resume to add a few personal questions.
          </p>
        </section>

        <button type='submit' disabled={busy} className='btn-primary'>
          {busy ? 'Preparing your questions...' : 'Create interview'}
        </button>
        {busy && <p className='text-sm text-ink/60'>This can take up to 30 seconds when AI is used.</p>}
      </form>
    </Shell>
  )
}
