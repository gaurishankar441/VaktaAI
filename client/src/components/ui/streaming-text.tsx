import { useEffect, useState } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = '' }: StreamingTextProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return (
    <div className={className}>
      {displayText}
      {isStreaming && (
        <span className="inline-flex ml-1">
          <span className="animate-bounce">.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
        </span>
      )}
    </div>
  );
}
