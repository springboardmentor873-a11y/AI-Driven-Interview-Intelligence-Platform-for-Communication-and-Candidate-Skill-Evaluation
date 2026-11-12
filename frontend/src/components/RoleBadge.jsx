const styles = {
  candidate: 'bg-sand text-ink',
  recruiter: 'bg-saffron/30 text-ink',
  admin: 'bg-moss text-paper',
}

export default function RoleBadge({ role }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[role] || styles.candidate}`}>
      {role}
    </span>
  )
}