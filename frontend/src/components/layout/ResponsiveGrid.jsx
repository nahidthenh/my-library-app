import React from 'react';

const ResponsiveGrid = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className = '',
  ...props
}) => {
  const gapClasses = {
    'none': 'gap-0',
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8'
  };

  // Build responsive grid classes
  const gridClasses = [
    'grid',
    `grid-cols-${columns.xs || 1}`,
    columns.sm ? `sm:grid-cols-${columns.sm}` : '',
    columns.md ? `md:grid-cols-${columns.md}` : '',
    columns.lg ? `lg:grid-cols-${columns.lg}` : '',
    columns.xl ? `xl:grid-cols-${columns.xl}` : '',
    gapClasses[gap],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  );
};

// Responsive Grid Item
export const GridItem = ({
  children,
  span = { xs: 1 },
  className = '',
  ...props
}) => {
  const spanClasses = [
    `col-span-${span.xs || 1}`,
    span.sm ? `sm:col-span-${span.sm}` : '',
    span.md ? `md:col-span-${span.md}` : '',
    span.lg ? `lg:col-span-${span.lg}` : '',
    span.xl ? `xl:col-span-${span.xl}` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={spanClasses} {...props}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
