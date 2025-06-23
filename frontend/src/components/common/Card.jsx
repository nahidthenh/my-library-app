import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  hover = false,
  interactive = false,
  glass = false,
  gradient = false,
  animate = true,
  onClick,
  ...props
}) => {
  // Use our design system classes
  const baseClasses = 'card';

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const shadows = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const effects = {
    hover: hover ? 'card-hover' : '',
    interactive: interactive ? 'card-interactive' : '',
    glass: glass ? 'glass' : '',
    gradient: gradient ? 'gradient-primary text-white' : '',
    animate: animate ? 'fade-in' : ''
  };

  const classes = [
    baseClasses,
    paddings[padding],
    shadows[shadow],
    effects.hover,
    effects.interactive,
    effects.glass,
    effects.gradient,
    effects.animate,
    onClick ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className={classes} onClick={handleClick} {...props}>
      {children}
    </div>
  );
};

// Enhanced Card sub-components
Card.Header = ({ children, className = '', animate = true, ...props }) => (
  <div className={`border-b border-gray-200 pb-4 mb-4 ${animate ? 'slide-down' : ''} ${className}`} {...props}>
    {children}
  </div>
);

Card.Body = ({ children, className = '', animate = true, ...props }) => (
  <div className={`${animate ? 'fade-in' : ''} ${className}`} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '', animate = true, ...props }) => (
  <div className={`border-t border-gray-200 pt-4 mt-4 ${animate ? 'slide-up' : ''} ${className}`} {...props}>
    {children}
  </div>
);

// Card Title Component
Card.Title = ({ children, size = 'lg', className = '', ...props }) => {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-medium',
    lg: 'text-lg font-semibold',
    xl: 'text-xl font-semibold',
    '2xl': 'text-2xl font-bold'
  };

  return (
    <h3 className={`text-gray-900 ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </h3>
  );
};

// Card Description Component
Card.Description = ({ children, className = '', ...props }) => (
  <p className={`text-gray-600 text-sm ${className}`} {...props}>
    {children}
  </p>
);

export default Card;
