import React from 'react';

const ResponsiveContainer = ({
  children,
  maxWidth = '7xl',
  padding = true,
  className = '',
  ...props
}) => {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  };

  const paddingClasses = padding ? 'container-responsive' : '';

  const classes = [
    'mx-auto',
    maxWidthClasses[maxWidth],
    paddingClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
