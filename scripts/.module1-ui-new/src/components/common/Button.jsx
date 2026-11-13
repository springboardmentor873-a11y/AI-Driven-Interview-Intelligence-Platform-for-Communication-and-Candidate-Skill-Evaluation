import React from 'react';

export default function Button({
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  variant = 'primary',
  size = 'md',
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent shadow-xs',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 focus:ring-blue-500 shadow-xs',
    outline: 'bg-transparent text-blue-600 hover:bg-blue-50 border border-blue-600 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent shadow-xs',
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;
  const selectedVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${selectedSize} ${selectedVariant} ${className}`}
    >
      {children}
    </button>
  );
}
