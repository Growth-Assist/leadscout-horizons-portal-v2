import React from 'react';

/**
 * Detects if the provided text is an email address and renders it as a clickable mailto link.
 * Used React.createElement to ensure strict compatibility with .js file extensions.
 * 
 * @param {string} text - The text to evaluate and render.
 * @returns {React.ReactNode | string} - The rendered link or original text.
 */
export const renderEmailAsLink = (text) => {
  if (typeof text !== 'string') return text;
  
  const trimmedText = text.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (emailRegex.test(trimmedText)) {
    return React.createElement(
      'a',
      {
        href: `mailto:${trimmedText}`,
        className: 'text-primary hover:underline',
        onClick: (e) => e.stopPropagation()
      },
      trimmedText
    );
  }
  
  return text;
};