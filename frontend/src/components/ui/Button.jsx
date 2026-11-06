export default function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-btn-brand text-white shadow-glow hover:opacity-90",
    solid: "bg-brand-500 text-white hover:bg-brand-600",
    ghost: "text-white/70 hover:text-white",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}