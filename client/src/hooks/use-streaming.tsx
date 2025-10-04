import { useState, useCallback } from 'react';
import { streamChatMessage } from '@/lib/api';

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  citations: any[];
}

export function useStreaming() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    error: null,
    citations: [],
  });

  const startStreaming = useCallback(async (
    chatId: string,
    message: string,
    onComplete?: (content: string) => void
  ) => {
    setState({
      isStreaming: true,
      content: '',
      error: null,
      citations: [],
    });

    await streamChatMessage(
      chatId,
      message,
      (chunk) => {
        setState(prev => ({
          ...prev,
          content: prev.content + chunk,
        }));
      },
      (citations) => {
        setState(prev => ({
          ...prev,
          citations,
        }));
      },
      () => {
        setState(prev => ({
          ...prev,
          isStreaming: false,
        }));
        if (onComplete) {
          onComplete(state.content);
        }
      },
      (error) => {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error,
        }));
      }
    );
  }, [state.content]);

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      content: '',
      error: null,
      citations: [],
    });
  }, []);

  return {
    ...state,
    startStreaming,
    reset,
  };
}
