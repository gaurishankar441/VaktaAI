import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Bot } from "lucide-react";

interface Citation {
  chunkId: string;
  source: string;
  page?: number;
  time?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tutor';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

interface TutorContent {
  explanation?: string;
  worked_example?: string;
  practice_prompt?: string;
  hint?: string;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTutor = message.role === 'tutor';
  
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering for basic formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />');
  };

  // Parse tutor content if it's JSON
  const parseTutorContent = (content: string): TutorContent | null => {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && (parsed.explanation || parsed.worked_example || parsed.practice_prompt || parsed.hint)) {
        return parsed;
      }
    } catch {
      // Not JSON, return null
    }
    return null;
  };

  const tutorContent = isTutor ? parseTutorContent(message.content) : null;

  return (
    <div className="flex gap-3 chat-message">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-secondary' : 'bg-primary'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className={`w-4 h-4 ${isUser ? '' : 'text-primary-foreground'}`} />
        )}
      </div>
      
      <div className="flex-1 max-w-3xl">
        <Card className={`p-4 ${isUser ? 'bg-secondary' : 'bg-accent'}`}>
          {tutorContent ? (
            <div className="space-y-3">
              {tutorContent.explanation && (
                <div>
                  <div 
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(tutorContent.explanation) }}
                  />
                </div>
              )}
              
              {tutorContent.worked_example && (
                <div className="bg-muted/50 p-3 rounded-md border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Example:</p>
                  <div 
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(tutorContent.worked_example) }}
                  />
                </div>
              )}
              
              {tutorContent.hint && (
                <div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/20">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">Hint:</p>
                  <div 
                    className="text-sm prose prose-sm max-w-none text-blue-900 dark:text-blue-100"
                    dangerouslySetInnerHTML={{ __html: renderContent(tutorContent.hint) }}
                  />
                </div>
              )}
              
              {tutorContent.practice_prompt && (
                <div className="bg-primary/10 p-3 rounded-md border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-2">Try This:</p>
                  <div 
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(tutorContent.practice_prompt) }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div 
              className="text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
            />
          )}
          
          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {message.citations.map((citation, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-accent"
                    data-testid={`citation-${index}`}
                  >
                    {citation.source}
                    {citation.page && `, page ${citation.page}`}
                    {citation.time && `, ${Math.floor(citation.time / 60)}:${Math.floor(citation.time % 60).toString().padStart(2, '0')}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
        
        <p className="text-xs text-muted-foreground mt-1">
          {isStreaming ? 'Generating...' : formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
