import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  animate = true,
  onClick,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-pressed': ariaPressed,
  ...props
}) => {
  // Use our design system classes
  const baseClasses = 'btn';

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
    outline: 'border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50 focus:ring-blue-500'
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const animationClasses = animate ? 'hover-lift' : '';

  const classes = [
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    animationClasses,
    className
  ].filter(Boolean).join(' ');

  const LoadingSpinner = () => (
    <div className="loading-spinner w-4 h-4 mr-2" />
  );

  const renderIcon = () => {
    if (!icon) return null;

    const iconClasses = iconPosition === 'right' ? 'ml-2' : 'mr-2';

    return (
      <span className={`${iconClasses} flex-shrink-0`}>
        {typeof icon === 'string' ? <span>{icon}</span> : icon}
      </span>
    );
  };

  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel || (loading ? `Loading: ${children}` : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-disabled={disabled || loading}
      {...props}
    >
      <div className="flex items-center justify-center">
        {loading && <LoadingSpinner />}
        {!loading && iconPosition === 'left' && renderIcon()}
        <span className={icon && !loading ? 'flex-1' : ''}>{children}</span>
        {!loading && iconPosition === 'right' && renderIcon()}
      </div>
    </button>
  );
};

export default Button;
