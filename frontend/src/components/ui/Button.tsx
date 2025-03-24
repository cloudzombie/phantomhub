import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Base styles for all buttons
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500';
  
  // Size variations
  const sizeStyles = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  // Variant styles
  const variantStyles = {
    primary: 'bg-brand-500 text-black hover:bg-brand-400 focus:ring-brand-500 shadow-glow-green',
    secondary: 'bg-accent-500 text-black hover:bg-accent-400 focus:ring-accent-500 shadow-glow-blue',
    ghost: 'bg-transparent text-brand-500 hover:bg-white/10 focus:ring-brand-500',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-600',
    accent: 'bg-blue-500 text-black hover:bg-blue-400 focus:ring-blue-500 shadow-glow-blue',
    success: 'bg-green-600 text-white hover:bg-green-500 focus:ring-green-600',
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Disabled styles override
  const disabledStyles = (disabled || loading)
    ? 'opacity-60 cursor-not-allowed hover:bg-opacity-100 hover:bg-current'
    : '';
  
  // Combine all styles
  const buttonClasses = `
    ${baseStyles} 
    ${sizeStyles[size]} 
    ${variantStyles[variant]} 
    ${widthStyles}
    ${disabledStyles} 
    ${className}
  `.trim();
  
  return (
    <button 
      className={buttonClasses} 
      disabled={disabled || loading}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {loading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{children}</span>
        </div>
      ) : (
        <>{children}</>
      )}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button; 