export default function Select({ label, error, children, ...props }) {
  return (
    <label className="block text-sm font-medium text-gray-900">
      {label}
      <select
        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}