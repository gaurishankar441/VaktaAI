import { useEffect, useRef } from 'react';

interface LaTeXRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
}

export function LaTeXRenderer({ content, inline = false, className = '' }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Simple LaTeX-like rendering for mathematical expressions
    // In production, would use KaTeX library
    let processedContent = content;

    // Replace inline math $...$ with styled spans
    processedContent = processedContent.replace(/\$([^$]+)\$/g, (match, mathContent) => {
      return `<span class="math-inline font-math italic bg-blue-50 px-1 py-0.5 rounded text-blue-900">${mathContent}</span>`;
    });

    // Replace display math $$...$$ with styled divs
    processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
      return `<div class="math-display font-math text-center my-4 p-4 bg-blue-50 rounded-lg text-blue-900 text-lg">${mathContent}</div>`;
    });

    containerRef.current.innerHTML = processedContent;
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`${inline ? 'inline' : 'block'} ${className}`}
    />
  );
}
