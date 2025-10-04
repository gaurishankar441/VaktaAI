import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { StreamingText } from '@/components/ui/streaming-text';
import { useStreaming } from '@/hooks/use-streaming';
import { apiRequest } from '@/lib/api';

interface ChatInterfaceProps {
  chatId: string;
  config: any;
  onNewSession: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
}

export default function ChatInterface({ chatId, config, onNewSession }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isStreaming, content: streamingContent, startStreaming, reset: resetStreaming } = useStreaming();

  // Fetch messages
  const { data: messages, refetch } = useQuery({
    queryKey: ['/api/chats', chatId, 'messages'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/chats/${chatId}/messages`);
      return response.json();
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSubmitting) return;

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

  const handleAnswerSelect = async (answer: string) => {
    setIsSubmitting(true);
    resetStreaming();

    try {
      await startStreaming(chatId, answer, () => {
        refetch();
        setIsSubmitting(false);
      });
    } catch (error) {
      console.error('Failed to send answer:', error);
      setIsSubmitting(false);
    }
  };

  const parseCheckQuestion = (content: string) => {
    const checkQuestionMatch = content.match(/Check Your Understanding[\s\S]*?(?=\n\n|$)/);
    if (!checkQuestionMatch) return null;

    const questionText = checkQuestionMatch[0];
    const optionMatches = questionText.match(/[A-D]\)\s*([^\n]+)/g);
    
    if (!optionMatches) return null;

    return {
      question: questionText.split('\n')[0].replace('Check Your Understanding', '').trim(),
      options: optionMatches.map(option => {
        const [label, text] = option.split(')');
        return { label: label.trim(), text: text.trim() };
      })
    };
  };

  const renderMessage = (message: Message) => {
    const checkQuestion = parseCheckQuestion(message.content);
    const contentWithoutQuestion = checkQuestion 
      ? message.content.replace(/Check Your Understanding[\s\S]*?(?=\n\n|$)/, '').trim()
      : message.content;

    if (message.role === 'user') {
      return (
        <div key={message.id} className="flex gap-4 justify-end" data-testid={`message-user-${message.id}`}>
          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
              <span className="text-sm font-semibold text-foreground">You</span>
            </div>
            <div className="bg-primary text-primary-foreground px-4 py-3 rounded-xl">
              <LaTeXRenderer content={message.content} className="text-sm leading-relaxed" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
            AS
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className="flex gap-4" data-testid={`message-assistant-${message.id}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
          <i className="fas fa-robot text-white text-sm"></i>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-foreground">VaktaAI Tutor</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="prose prose-sm max-w-none">
            <LaTeXRenderer content={contentWithoutQuestion} className="text-sm text-foreground leading-relaxed" />
            
            {/* Check Question */}
            {checkQuestion && (
              <Card className="mt-4 p-4 bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  <i className="fas fa-question-circle mr-2"></i>Check Your Understanding
                </p>
                <p className="text-sm text-blue-800 mb-4">{checkQuestion.question}</p>
                <div className="space-y-2">
                  {checkQuestion.options.map((option) => (
                    <Button
                      key={option.label}
                      variant="outline"
                      className="w-full text-left justify-start bg-white hover:bg-blue-100 border-blue-200 text-sm"
                      onClick={() => handleAnswerSelect(option.label)}
                      disabled={isSubmitting}
                      data-testid={`button-answer-${option.label}`}
                    >
                      <span className="font-semibold mr-2">{option.label})</span>
                      {option.text}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6" data-testid="chat-messages">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages?.map(renderMessage)}
          
          {/* Streaming Message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">VaktaAI Tutor</span>
                  <span className="text-xs text-muted-foreground">now</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <StreamingText
                    text={streamingContent}
                    isStreaming={isStreaming}
                    className="text-sm text-foreground leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              data-testid="button-attach"
            >
              <i className="fas fa-paperclip text-muted-foreground"></i>
            </Button>

            <Input
              type="text"
              placeholder="Ask a question or type your answer..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isSubmitting || isStreaming}
              className="flex-1"
              data-testid="input-message"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              data-testid="button-voice"
            >
              <i className="fas fa-microphone text-muted-foreground"></i>
            </Button>

            <Button
              type="submit"
              disabled={!inputMessage.trim() || isSubmitting || isStreaming}
              className="flex-shrink-0"
              data-testid="button-send"
            >
              <span>Send</span>
              <i className="fas fa-paper-plane ml-2 text-sm"></i>
            </Button>
          </form>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span><i className="fas fa-keyboard mr-1"></i> Press Enter to send</span>
            <span><i className="fas fa-microphone mr-1"></i> Click mic for voice input</span>
            <Button
              variant="link"
              size="sm"
              onClick={onNewSession}
              className="text-xs h-auto p-0"
              data-testid="button-new-session"
            >
              <i className="fas fa-plus mr-1"></i>
              New Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
