import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder = '',
  className = '',
  error = '',
  id: customId,
  name,
  autoComplete,
  showPasswordToggle = false,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = customId || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`block w-full px-3.5 py-2.5 bg-white border ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
            isPasswordField || showPasswordToggle ? 'pr-11' : ''
          }`}
        />
        {(isPasswordField || showPasswordToggle) && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none"
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
