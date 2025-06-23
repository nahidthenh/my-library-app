import { useEffect, useRef } from 'react';

// Hook for managing focus
export const useFocus = () => {
  const focusRef = useRef(null);

  const setFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  const setFocusWithDelay = (delay = 100) => {
    setTimeout(() => setFocus(), delay);
  };

  return { focusRef, setFocus, setFocusWithDelay };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (items, onSelect) => {
  const currentIndex = useRef(-1);

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          currentIndex.current = Math.min(currentIndex.current + 1, items.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          currentIndex.current = Math.max(currentIndex.current - 1, 0);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (currentIndex.current >= 0 && items[currentIndex.current]) {
            onSelect(items[currentIndex.current], currentIndex.current);
          }
          break;
        case 'Escape':
          currentIndex.current = -1;
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, onSelect]);

  return { currentIndex: currentIndex.current };
};

// Hook for screen reader announcements
export const useScreenReader = () => {
  const announce = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const announcePolite = (message) => announce(message, 'polite');
  const announceAssertive = (message) => announce(message, 'assertive');

  return { announce, announcePolite, announceAssertive };
};

// Hook for managing ARIA attributes
export const useAria = (initialState = {}) => {
  const ariaProps = useRef(initialState);

  const setAriaProps = (newProps) => {
    ariaProps.current = { ...ariaProps.current, ...newProps };
  };

  const getAriaProps = () => ariaProps.current;

  const toggleAriaExpanded = () => {
    const current = ariaProps.current['aria-expanded'];
    setAriaProps({ 'aria-expanded': current === 'true' ? 'false' : 'true' });
  };

  return {
    ariaProps: ariaProps.current,
    setAriaProps,
    getAriaProps,
    toggleAriaExpanded
  };
};

// Hook for skip links
export const useSkipLinks = () => {
  useEffect(() => {
    const skipLinks = document.querySelectorAll('.skip-link');
    
    skipLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }, []);
};

// Hook for reduced motion preference
export const useReducedMotion = () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion;
};

// Hook for high contrast mode
export const useHighContrast = () => {
  const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
  return prefersHighContrast;
};

export default {
  useFocus,
  useKeyboardNavigation,
  useScreenReader,
  useAria,
  useSkipLinks,
  useReducedMotion,
  useHighContrast
};
