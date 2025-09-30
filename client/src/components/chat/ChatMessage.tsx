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
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
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
          <div 
            className="text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
          />
          
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
