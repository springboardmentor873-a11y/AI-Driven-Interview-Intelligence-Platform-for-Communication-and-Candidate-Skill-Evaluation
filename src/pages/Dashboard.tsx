import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileBarChart, FileUser, Video, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui';

const steps = [
  { number: '01', icon: FileUser, title: 'Prepare your resume', description: 'Your skills and experience will shape your interview questions.', to: '/resume', link: 'Resume details' },
  { number: '02', icon: Video, title: 'Practice an interview', description: 'Technical, HR, behavioral, or aptitude. Practice for your next role.', to: '/interview', link: 'Explore interviews' },
  { number: '03', icon: BarChart3, title: 'Learn from feedback', description: 'Review your answers, communication, and areas to improve.', to: '/analytics', link: 'View progress' },
];
export default function Dashboard() {
  const { profile, session } = useAuth();
  const name = String(profile?.full_name || session?.user.user_metadata.full_name || 'there').split(' ')[0];
  return <div className="overview">
    <div className="page-heading"><div><div className="eyebrow small-eyebrow">YOUR WORKSPACE</div><h1>Welcome, {name}.</h1><p>A little practice. A more confident next interview.</p></div><Link className="subtle-link" to="/profile">My profile <ArrowRight size={16} /></Link></div>
    <section className="practice-intro" aria-labelledby="practice-title">
      <div className="practice-copy"><span className="feature-status">INTERVIEW PRACTICE · COMING SOON</span><h2 id="practice-title">Make your next<br />interview feel familiar.</h2><p>Practice answering questions that match your skills, then get clear feedback to help you improve.</p><Link className="button" to="/interview">Explore mock interviews <ArrowRight size={17} /></Link></div>
      <img src="/images/login-interview-flat.png" alt="A candidate practicing a video interview" width="360" height="240" />
    </section>
    <section className="preparation" aria-labelledby="preparation-title"><div className="overview-section-heading"><h2 id="preparation-title">Your preparation, in three steps</h2><span>Planned features</span></div><div className="preparation-grid">{steps.map(({ number, icon: Icon, title, description, to, link }) => <Link className="preparation-step" to={to} key={number}><div className="step-top"><Icon size={22} /><span>{number}</span></div><h3>{title}</h3><p>{description}</p><span className="step-link">{link}<ArrowRight size={16} /></span></Link>)}</div></section>
    <section className="recent-sessions" aria-labelledby="recent-title"><div className="overview-section-heading"><h2 id="recent-title">Recent interviews</h2><Link className="subtle-link" to="/interviews">View history <ArrowRight size={15} /></Link></div><div className="session-empty"><span className="session-icon"><History size={23} /></span><div><h3>No interviews yet</h3><p>Your completed sessions and feedback will appear here when interview practice launches.</p></div></div></section>
  </div>;
}

const upcoming = {
  interview: { icon: Video, title: 'Your practice room is taking shape.', description: 'Personalized mock interviews are coming soon. You’ll be able to practice technical, HR, behavioral, and aptitude questions with an AI interview coach.', heading: 'Start an interview', tags: ['Technical', 'HR & culture', 'Behavioral', 'Aptitude'] },
  interviews: { icon: Video, title: 'A fresh start. A world of possibility.', description: 'You haven’t completed any interviews yet. Once interview practice is available, revisit your sessions and feedback here.', heading: 'My interviews', tags: [] },
  resume: { icon: FileUser, title: 'Your experience deserves a great introduction.', description: 'Secure resume uploads and AI-powered resume analysis are coming in a future phase. For now, add your skills, education, and preferred role to your profile.', heading: 'My resume', tags: ['Private storage', 'Resume analysis', 'Actionable feedback'] },
  analytics: { icon: BarChart3, title: 'Every step forward will show.', description: 'Performance insights will become available after your first assessed interview. No scores or trends have been recorded yet.', heading: 'Performance analytics', tags: [] },
  reports: { icon: FileBarChart, title: 'Your next insight is ahead of you.', description: 'Your interview reports and personalized feedback will appear here when assessments launch. You have no completed reports yet.', heading: 'Reports', tags: [] },
};
export function UpcomingPage({ page }: { page: keyof typeof upcoming }) {
  const data = upcoming[page];
  return <><div className="page-heading"><div><div className="eyebrow small-eyebrow">BUILDING YOUR NEXT CHAPTER</div><h1>{data.heading}</h1><p>Thoughtful tools for a more confident you.</p></div><span className="pill">Coming soon</span></div><section className="card upcoming-card"><EmptyState icon={data.icon} title={data.title} description={data.description}><div className="upcoming-tags">{data.tags.map(tag => <span className="pill" key={tag}>{tag}</span>)}</div><Link className="button" to="/profile">Get your profile ready <ArrowRight size={17} /></Link><Link className="subtle-link" to="/dashboard">Back to overview</Link></EmptyState></section></>;
}
