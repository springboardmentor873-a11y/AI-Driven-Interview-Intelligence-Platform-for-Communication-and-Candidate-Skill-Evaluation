// Friendly names for values that come from the API.
export const categoryLabel = {
  hr: 'HR',
  technical: 'Technical',
  behavioral: 'Behavioral',
  aptitude: 'Aptitude',
}

export const difficultyLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const sessionStatusLabel = {
  created: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  assessed: 'Assessed',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
}

export const resumeStatusLabel = {
  uploaded: 'Uploaded',
  parsed: 'Parsed',
  no_text: 'No text found',
  template: 'Unfilled template',
  failed: 'Could not read',
}

// Green for good, saffron for waiting, clay for problems.
export const resumeStatusStyle = {
  parsed: 'bg-moss/10 text-moss',
  uploaded: 'bg-saffron/30 text-ink',
  no_text: 'bg-clay/10 text-clay',
  template: 'bg-clay/10 text-clay',
  failed: 'bg-clay/10 text-clay',
}
