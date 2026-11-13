import { useId, useState, type InputHTMLAttributes, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/" aria-label="SmartHire AI home"><span className="brand-mark">✦</span><span>SmartHire <em>AI</em></span></Link>;
}
export function Button({ children, busy, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return <button className={`button ${className}`} {...props} disabled={props.disabled || busy}>{busy ? <><LoaderCircle className="spin" size={18} /> Please wait…</> : children}</button>;
}
export function Field({ label, icon: Icon, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: LucideIcon; hint?: string; error?: string }) {
  const id = useId(); const [visible, setVisible] = useState(false); const password = props.type === 'password';
  return <div className="field"><label htmlFor={id}>{label}</label><div className={`input-wrap ${error ? 'invalid' : ''}`}>{Icon && <Icon size={18} aria-hidden="true" />}<input {...props} id={id} type={password && visible ? 'text' : props.type} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-hint` : undefined} />{password && <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}>{visible ? <Eye size={18} /> : <EyeOff size={18} />}</button>}</div>{(hint || error) && <small className={error ? 'field-error' : 'field-hint'} id={`${id}-hint`}>{error || hint}</small>}</div>;
}
export function Notice({ children, type = 'error' }: { children: ReactNode; type?: 'error' | 'success' | 'info' }) {
  if (!children) return null;
  return <div className={`notice notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>{type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{children}</span></div>;
}
export function Loading() { return <div className="loading-screen" role="status"><Sparkles size={30} /><LoaderCircle className="spin" /><span>Getting your space ready…</span></div>; }
export function EmptyState({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={26} /></div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
