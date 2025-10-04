export const API_BASE = '/api';

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<Response> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response;
}

export async function uploadFile(file: File, endpoint: string): Promise<Response> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response;
}

// SSE streaming helper
export function createEventSource(endpoint: string, options?: {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}): EventSource {
  const eventSource = new EventSource(`${API_BASE}${endpoint}`);

  if (options?.onMessage) {
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage!(data);
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };
  }

  if (options?.onError) {
    eventSource.onerror = options.onError;
  }

  if (options?.onClose) {
    eventSource.addEventListener('close', options.onClose);
  }

  return eventSource;
}

// Stream chat messages
export async function streamChatMessage(
  chatId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onCitation?: (citations: any[]) => void,
  onComplete?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content') {
              onChunk(parsed.data);
            } else if (parsed.type === 'citations' && onCitation) {
              onCitation(parsed.data);
            } else if (parsed.type === 'done' && onComplete) {
              onComplete();
              return;
            } else if (parsed.type === 'error' && onError) {
              onError(parsed.message);
              return;
            }
          } catch (error) {
            // Ignore parsing errors for partial chunks
          }
        }
      }
    }
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error.message : 'Stream failed');
    }
  }
}
