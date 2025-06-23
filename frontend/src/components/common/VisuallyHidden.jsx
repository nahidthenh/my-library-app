import React from 'react';

const VisuallyHidden = ({ children, focusable = false, ...props }) => {
  const className = focusable ? 'sr-only focus-within:not-sr-only' : 'sr-only';
  
  return (
    <span className={className} {...props}>
      {children}
    </span>
  );
};

export default VisuallyHidden;
