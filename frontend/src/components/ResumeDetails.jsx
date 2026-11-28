import { useState } from 'react'
import api from '../api/client'
import { errorText } from '../api/errors'

const MAX_CHIPS = 10

function Chips({ items }) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className='rounded-full bg-sand px-2.5 py-1 text-xs font-semibold'>
          {item}
        </span>
      ))}
    </div>
  )
}

// One section of the details panel. Shows a friendly line instead of being left blank.
function Section({ title, empty, children }) {
  return (
    <div>
      <h4 className='text-xs font-semibold uppercase tracking-wide text-ink/50'>{title}</h4>
      {empty ? (
        <p className='mt-1.5 text-sm text-ink/55'>Not found in this resume.</p>
      ) : (
        <div className='mt-1.5'>{children}</div>
      )}
    </div>
  )
}

function ExperienceTimeline({ items }) {
  return (
    <ol className='space-y-3 border-l-2 border-sand pl-4'>
      {items.map((item, i) => (
        <li key={i}>
          <p className='font-semibold'>
            {item.role || 'Role not stated'}
            {item.company && <span className='font-normal text-ink/60'> · {item.company}</span>}
          </p>
          {item.duration && <p className='text-xs text-ink/55'>{item.duration}</p>}
          {item.highlights?.length > 0 && (
            <ul className='mt-1 list-disc space-y-0.5 pl-4 text-sm text-ink/80'>
              {item.highlights.map((highlight, j) => (
                <li key={j}>{highlight}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

function EducationList({ items }) {
  return (
    <ul className='space-y-2'>
      {items.map((item, i) => (
        <li key={i} className='text-sm'>
          <span className='font-semibold'>{item.degree || 'Degree not stated'}</span>
          {item.institution && <span> · {item.institution}</span>}
          {(item.year || item.score) && (
            <span className='text-ink/60'> · {[item.year, item.score].filter(Boolean).join(' · ')}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function ProjectList({ items }) {
  return (
    <ul className='space-y-3'>
      {items.map((item, i) => (
        <li key={i} className='text-sm'>
          <p className='font-semibold'>
            {item.name || 'Untitled project'}
            {item.tech && <span className='font-normal text-ink/60'> · {item.tech}</span>}
          </p>
          {item.description && <p className='mt-0.5 text-ink/80'>{item.description}</p>}
        </li>
      ))}
    </ul>
  )
}

function SimpleList({ items }) {
  return (
    <ul className='list-disc space-y-1 pl-4 text-sm text-ink/80'>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

// The full reading of a resume, shown after pressing "View details".
// Order: summary, skills, experience, education, projects, certifications, achievements.
function DetailsPanel({ data }) {
  const skills = data.skills || []
  const experience = data.experience_items || []
  const education = data.education_items || []
  const projects = data.project_items || []
  const certifications = data.certifications || []
  const achievements = data.achievements || []

  return (
    <div className='mt-4 space-y-5 rounded-2xl bg-sand/40 p-4'>
      <Section title='Summary' empty={!data.summary}>
        <p className='text-sm text-ink/80'>{data.summary}</p>
      </Section>
      <Section title='Skills' empty={skills.length === 0}>
        <Chips items={skills} />
      </Section>
      <Section title='Experience' empty={experience.length === 0}>
        <ExperienceTimeline items={experience} />
      </Section>
      <Section title='Education' empty={education.length === 0}>
        <EducationList items={education} />
      </Section>
      <Section title='Projects' empty={projects.length === 0}>
        <ProjectList items={projects} />
      </Section>
      <Section title='Certifications' empty={certifications.length === 0}>
        <SimpleList items={certifications} />
      </Section>
      <Section title='Achievements' empty={achievements.length === 0}>
        <SimpleList items={achievements} />
      </Section>
    </div>
  )
}

// Skill chips for a parsed resume, or a short note when the PDF could not be read.
// `onUpdated` is called with the fresh resume after a successful re-analyse.
export default function ResumeDetails({ resume, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const data = resume.parsed_data || {}

  if (['no_text', 'template', 'failed'].includes(resume.status)) {
    return <p className='mt-3 text-sm text-clay'>{data.message || 'We could not read this resume.'}</p>
  }
  if (resume.status !== 'parsed') return null

  const skills = data.skills || []
  const facts = [
    data.education?.length > 0 && data.education.join(', '),
    data.experience_years > 0 && `${data.experience_years} years experience`,
    data.has_internship && 'Internship',
  ].filter(Boolean)

  const reanalyse = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { data: updated } = await api.post(`/resumes/${resume.id}/reanalyse/`)
      onUpdated?.(updated)
      setMessage({ type: 'ok', text: 'Resume re-analysed with AI.' })
    } catch (err) {
      setMessage({ type: 'error', text: errorText(err, 'We could not re-analyse this resume.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='mt-3'>
      {skills.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {skills.slice(0, MAX_CHIPS).map((skill) => (
            <span key={skill} className='rounded-full bg-sand px-2.5 py-1 text-xs font-semibold'>
              {skill}
            </span>
          ))}
          {skills.length > MAX_CHIPS && (
            <span className='rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold'>
              +{skills.length - MAX_CHIPS} more
            </span>
          )}
        </div>
      ) : (
        <p className='text-sm text-ink/55'>No known skills were found in this resume.</p>
      )}
      {facts.length > 0 && <p className='mt-2 text-xs text-ink/60'>{facts.join(' · ')}</p>}

      <div className='mt-3 flex flex-wrap items-center gap-3'>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            data.ai_used ? 'bg-moss/10 text-moss' : 'bg-sand text-ink/70'
          }`}
        >
          {data.ai_used ? 'Analysed with AI' : 'Basic analysis'}
        </span>
        {!data.ai_used && (
          <button
            type='button'
            onClick={reanalyse}
            disabled={busy}
            className='rounded-full border border-moss px-3 py-1 text-xs font-semibold text-moss transition hover:bg-moss hover:text-paper disabled:opacity-50'
          >
            {busy ? 'Re-analysing...' : 'Re-analyse with AI'}
          </button>
        )}
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className='text-sm font-semibold text-moss underline underline-offset-4'
        >
          {open ? 'Hide details' : 'View details'}
        </button>
      </div>

      {message && (
        <p
          className={`mt-2 rounded-xl px-3 py-2 text-xs ${
            message.type === 'ok' ? 'bg-moss/10 text-moss' : 'bg-clay/10 text-clay'
          }`}
        >
          {message.text}
        </p>
      )}

      {open && <DetailsPanel data={data} />}
    </div>
  )
}
