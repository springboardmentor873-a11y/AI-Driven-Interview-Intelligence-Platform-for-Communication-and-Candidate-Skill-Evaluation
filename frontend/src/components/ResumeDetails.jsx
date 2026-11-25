const MAX_CHIPS = 10

// Skill chips for a parsed resume, or a short note when the PDF could not be read.
export default function ResumeDetails({ resume }) {
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
    </div>
  )
}
