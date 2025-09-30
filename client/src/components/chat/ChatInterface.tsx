import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./ChatMessage";
import { Plus, Send, List, Highlighter, Pin, HelpCircle, Layers } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  threadId?: string;
  documentIds: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    chunkId: string;
    source: string;
    page?: number;
    time?: number;
  }>;
  createdAt: string;
}

export function ChatInterface({ threadId, documentIds }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages for the thread
  const { data: threadMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/chat/threads', threadId, 'messages'],
    enabled: !!threadId,
  });

  // Fetch document details to check for YouTube videos
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['/api/documents'],
  });

  useEffect(() => {
    if (threadMessages) {
      setMessages(threadMessages);
    }
  }, [threadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const sendMessageMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/chat/query', {
        query,
        documentIds,
        threadId,
        streaming: false,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Add both user and assistant messages
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input,
        createdAt: new Date().toISOString(),
      };

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setInput("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chat/summary', {
        documentIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: `**Document Summary:**\n\n${data.summary.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}\n\n**Potential Quiz Ideas:**\n${data.quizIdeas.map((idea: string, index: number) => `• ${idea}`).join('\n')}`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, summaryMessage]);
    },
  });

  const generateHighlightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chat/highlights', {
        documentIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const highlightsContent = data.map((highlight: any) => 
        `> ${highlight.text}\n*Source: ${highlight.source}${highlight.page ? `, page ${highlight.page}` : ''}*`
      ).join('\n\n');

      const highlightsMessage: Message = {
        id: `highlights-${Date.now()}`,
        role: 'assistant',
        content: `**Document Highlights:**\n\n${highlightsContent}`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, highlightsMessage]);
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/quizzes/generate', {
        documentIds,
        numberOfQuestions: 5,
        title: `Quiz from Chat - ${new Date().toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz Generated",
        description: "A new quiz has been created. Check the Quizzes section to take it.",
      });
    },
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/flashcards/generate', {
        documentIds,
        numberOfCards: 10,
        title: `Flashcards from Chat - ${new Date().toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Flashcards Generated",
        description: "A new flashcard deck has been created. Check the Flashcards section to review them.",
      });
    },
  });

  const handleSendMessage = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Find YouTube videos in the current documents
  const selectedDocuments = documents.filter((doc: any) => documentIds.includes(doc.id));
  const youtubeDoc = selectedDocuments.find((doc: any) => doc.sourceType === 'youtube');
  
  // Extract YouTube video ID
  const getYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
      /(?:youtube\.com\/live\/)([^&\n?#]+)/,
      /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url?.match(pattern);
      if (match) return match[1];
    }
    return '';
  };

  // Get video ID from metadata first, fallback to URL parsing
  const getDocumentVideoId = (doc: any): string => {
    return doc.metadata?.videoId || getYouTubeId(doc.sourceUrl || '');
  };

  const youtubeVideoId = youtubeDoc ? getDocumentVideoId(youtubeDoc) : '';

  // Parse transcript from document metadata
  const getTranscript = () => {
    if (!youtubeDoc?.metadata?.transcript) return [];
    
    // Parse transcript text with timestamps
    const transcriptText = youtubeDoc.metadata.transcript;
    const timestampRegex = /\[(\d+:\d+(?::\d+)?)\]\s*([^\[]+)/g;
    const matches = [...transcriptText.matchAll(timestampRegex)];
    
    return matches.map(match => ({
      timestamp: match[1],
      text: match[2].trim()
    }));
  };

  const transcript = getTranscript();

  return (
    <div className="h-full flex">
      {/* Sources Panel */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Sources</h2>
          <p className="text-sm text-muted-foreground mt-1">Documents for this chat</p>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {selectedDocuments.map((doc: any, index: number) => {
              const docVideoId = doc.sourceType === 'youtube' ? getDocumentVideoId(doc) : '';
              return (
                <Card key={doc.id} className="p-3 hover:bg-accent cursor-pointer">
                  {doc.sourceType === 'youtube' && docVideoId ? (
                    <div className="space-y-2">
                      <img 
                        src={`https://img.youtube.com/vi/${docVideoId}/hqdefault.jpg`}
                        alt={doc.title}
                        className="w-full rounded"
                      />
                      <p className="text-xs truncate">{doc.sourceUrl}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center">
                        <div className="w-4 h-4 bg-red-600 rounded-sm"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <Button 
            variant="outline" 
            className="w-full"
            data-testid="button-add-source"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Document Chat</h2>
          <p className="text-sm text-muted-foreground">Ask questions about your documents</p>
        </div>
        
        {/* YouTube Video Player and Transcript */}
        {youtubeVideoId && (
          <div className="border-b border-border">
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="youtube-player"
                />
              </div>
            </div>
            
            {/* Transcript Section */}
            {transcript.length > 0 && (
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Transcript</h3>
                  <Input
                    type="text"
                    placeholder="Search for keywords in transcript..."
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    className="max-w-xs"
                    data-testid="input-transcript-search"
                  />
                </div>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-3">
                    {transcript
                      .filter(item => 
                        !transcriptSearch || 
                        item.text.toLowerCase().includes(transcriptSearch.toLowerCase())
                      )
                      .map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-primary font-mono text-xs mr-2">{item.timestamp}</span>
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {/* Streaming message */}
            {isStreaming && streamingMessage && (
              <ChatMessage 
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingMessage,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming={true}
              />
            )}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary-foreground rounded-sm animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <div className="bg-accent p-3 rounded-lg">
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your documents..."
              className="flex-1"
              data-testid="input-chat"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!input.trim() || sendMessageMutation.isPending}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Actions Panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Actions</h2>
          <p className="text-sm text-muted-foreground">Quick document tools</p>
        </div>
        <div className="p-4 space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => generateSummaryMutation.mutate()}
            disabled={generateSummaryMutation.isPending}
            data-testid="button-generate-summary"
          >
            <List className="w-4 h-4 mr-3" />
            Summary
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => generateHighlightsMutation.mutate()}
            disabled={generateHighlightsMutation.isPending}
            data-testid="button-extract-highlights"
          >
            <Highlighter className="w-4 h-4 mr-3" />
            Highlights
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            data-testid="button-view-pinned"
          >
            <Pin className="w-4 h-4 mr-3" />
            Pinned
          </Button>
          
          <Separator />
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => generateQuizMutation.mutate()}
            disabled={generateQuizMutation.isPending}
            data-testid="button-generate-quiz"
          >
            <HelpCircle className="w-4 h-4 mr-3" />
            Generate Quiz
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => generateFlashcardsMutation.mutate()}
            disabled={generateFlashcardsMutation.isPending}
            data-testid="button-generate-flashcards"
          >
            <Layers className="w-4 h-4 mr-3" />
            Generate Flashcards
          </Button>
        </div>
      </div>
    </div>
  );
}
