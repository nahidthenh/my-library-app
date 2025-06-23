import React from 'react';

const SkipLinks = () => {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' }
  ];

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-blue-600 text-white p-2 space-x-2">
        {skipLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="skip-link inline-block px-3 py-2 bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SkipLinks;
