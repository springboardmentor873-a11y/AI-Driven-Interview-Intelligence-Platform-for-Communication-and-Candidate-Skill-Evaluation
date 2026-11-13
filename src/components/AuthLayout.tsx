import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Brand } from './ui';

const artwork = {
  login: { src: '/images/login-interview-flat.png', alt: 'A candidate practicing a video interview with an interviewer', title: 'Practice smarter. Interview better.', description: 'A little preparation today. More confidence for your next interview.' },
  register: { src: '/images/register-profile-flat.png', alt: 'Students preparing their resumes and building their candidate profiles', title: 'Your next opportunity starts here.', description: 'Build your profile, discover your strengths, and get interview-ready.' },
};

export default function AuthLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const register = pathname === '/register';
  const scene = register ? artwork.register : artwork.login;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Preload both scenes so swapping sides never reveals an unloaded image.
    Object.values(artwork).forEach(({ src }) => { const image = new Image(); image.src = src; });
  }, []);

  return (
    <main className={`auth-layout auth-simple ${register ? 'auth-register' : 'auth-login'}`}>
      <section className="brand-panel" aria-label="About SmartHire AI">
        <Brand />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="brand-story"
            key={register ? 'register' : 'login'}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <div className="illustration-wrap"><img className="hero-illustration" src={scene.src} alt={scene.alt} /></div>
            <h1>{scene.title}</h1>
            <p className="brand-description">{scene.description}</p>
          </motion.div>
        </AnimatePresence>
        <footer className="brand-footer"><span>© {new Date().getFullYear()} SmartHire AI</span><span>Prepare. Practice. Grow.</span></footer>
      </section>
      <section className="form-panel" aria-label={register ? 'Create an account' : 'Sign in'}>
        <div className="mobile-brand"><Brand /></div>
        <div className="auth-form-container">{children ?? <Outlet />}</div>
        <div className="auth-bottom"><ShieldCheck size={14} /> Your information stays private.</div>
      </section>
    </main>
  );
}
