import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { StreamingText } from '@/components/ui/streaming-text';
import { useStreaming } from '@/hooks/use-streaming';
import { apiRequest } from '@/lib/api';

interface ChatPanelProps {
  chatId: string | null;
  selectedDocuments: string[];
  onStartChat: () => void;
  hasDocuments: boolean;
}

const quickActions = [
  { id: 'summary', icon: 'fas fa-file-lines', iconColor: 'text-blue-600', title: 'Generate Summary' },
  { id: 'highlights', icon: 'fas fa-highlighter', iconColor: 'text-yellow-600', title: 'Extract Highlights' },
  { id: 'quiz', icon: 'fas fa-circle-question', iconColor: 'text-purple-600', title: 'Create Quiz' },
  { id: 'flashcards', icon: 'fas fa-clone', iconColor: 'text-green-600', title: 'Make Flashcards' },
  { id: 'export', icon: 'fas fa-file-export', iconColor: 'text-red-600', title: 'Export as PDF' },
];

export default function ChatPanel({ chatId, selectedDocuments, onStartChat, hasDocuments }: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isStreaming, content: streamingContent, citations, startStreaming, reset: resetStreaming } = useStreaming();

  // Fetch messages if chat is active
  const { data: messages, refetch } = useQuery({
    queryKey: ['/api/chats', chatId, 'messages'],
    queryFn: async () => {
      if (!chatId) return [];
      const response = await apiRequest('GET', `/chats/${chatId}/messages`);
      return response.json();
    },
    enabled: !!chatId
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSubmitting || !chatId) return;

    const messageToSend = inputMessage.trim();
    setInputMessage('');
    setIsSubmitting(true);
    resetStreaming();

    try {
      await startStreaming(chatId, messageToSend, () => {
        refetch();
        setIsSubmitting(false);
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    console.log(`Quick action: ${actionId}`);
    // TODO: Implement quick actions
  };

  const renderMessage = (message: any) => {
    if (message.role === 'user') {
      return (
        <div key={message.id} className="flex gap-3 justify-end" data-testid={`message-user-${message.id}`}>
          <div className="flex-1 max-w-xs">
            <div className="bg-primary text-primary-foreground px-4 py-3 rounded-xl rounded-tr-none">
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-xs font-semibold">
            AS
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className="flex gap-3" data-testid={`message-assistant-${message.id}`}>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <i className="fas fa-robot text-primary-foreground text-xs"></i>
        </div>
        <div className="flex-1">
          <div className="bg-muted px-4 py-3 rounded-xl rounded-tl-none">
            <LaTeXRenderer content={message.content} className="text-sm text-foreground" />
          </div>
          
          {/* Citations */}
          {message.metadata?.citations && message.metadata.citations.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Sources:</p>
              {message.metadata.citations.map((citation: any, index: number) => (
                <span
                  key={index}
                  className="inline-block text-xs text-primary cursor-pointer hover:underline mr-2"
                >
                  [Doc {citation.source}{citation.page ? `, p.${citation.page}` : ''}]
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!hasDocuments) {
    return (
      <div className="w-96 border-l border-border bg-card flex flex-col items-center justify-center p-8">
        <i className="fas fa-comments text-6xl text-muted-foreground mb-4"></i>
        <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Chat</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Select documents from the sidebar to start asking questions about them
        </p>
      </div>
    );
  }

  if (!chatId) {
    return (
      <div className="w-96 border-l border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Ask Questions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Chat with your {selectedDocuments.length} selected document{selectedDocuments.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <i className="fas fa-play-circle text-4xl text-primary mb-4"></i>
            <h3 className="text-lg font-semibold text-foreground mb-2">Start Conversation</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Begin asking questions about your documents
            </p>
            <Button onClick={onStartChat} data-testid="button-start-chat">
              <i className="fas fa-comments mr-2"></i>
              Start Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Ask Questions</h2>
        <p className="text-xs text-muted-foreground mt-1">Chat with your documents using AI</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" data-testid="chat-messages">
        {messages?.map(renderMessage)}
        
        {/* Streaming Message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <i className="fas fa-robot text-primary-foreground text-xs"></i>
            </div>
            <div className="flex-1">
              <div className="bg-muted px-4 py-3 rounded-xl rounded-tl-none">
                <StreamingText
                  text={streamingContent}
                  isStreaming={isStreaming}
                  className="text-sm text-foreground"
                />
              </div>
              
              {/* Citations for streaming */}
              {citations && citations.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                  {citations.map((citation: any, index: number) => (
                    <span
                      key={index}
                      className="inline-block text-xs text-primary cursor-pointer hover:underline mr-2"
                    >
                      [Doc {citation.source}{citation.page ? `, p.${citation.page}` : ''}]
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground mb-3">QUICK ACTIONS</p>
        
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="w-full justify-start hover:border-primary hover:bg-primary/5"
            onClick={() => handleQuickAction(action.id)}
            data-testid={`button-action-${action.id}`}
          >
            <i className={`${action.icon} w-5 mr-2 ${action.iconColor}`}></i>
            {action.title}
          </Button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask about the document..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isSubmitting || isStreaming}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputMessage.trim() || isSubmitting || isStreaming}
            data-testid="button-send-message"
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </Button>
        </form>
      </div>
    </div>
  );
}
