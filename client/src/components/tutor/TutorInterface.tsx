import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "../chat/ChatMessage";
import { Send, X, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TutorSession {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

interface TutorMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'tutor';
  content: string;
  messageType?: string;
  createdAt: string;
}

interface TutorInterfaceProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string | null) => void;
}

export function TutorInterface({ sessionId, onSessionChange }: TutorInterfaceProps) {
  const [showSetup, setShowSetup] = useState(!sessionId);
  const [input, setInput] = useState("");
  const [sessionData, setSessionData] = useState<{
    session: TutorSession;
    messages: TutorMessage[];
  } | null>(null);
  
  // Setup form state
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch session data
  const { data: currentSessionData, refetch } = useQuery({
    queryKey: ['/api/tutor/sessions', sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (currentSessionData) {
      setSessionData(currentSessionData);
      setShowSetup(false);
    }
  }, [currentSessionData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [sessionData?.messages]);

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { subject: string; gradeLevel: string; topic: string }) => {
      const response = await apiRequest('POST', '/api/tutor/sessions', sessionData);
      return response.json();
    },
    onSuccess: (newSession) => {
      setShowSetup(false);
      onSessionChange?.(newSession.id);
      toast({
        title: "Session Created",
        description: "Your AI tutor session has been started.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tutor session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/tutor/sessions/${sessionId}/message`, {
        content,
        streaming: false,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Refetch session data to get updated messages
      refetch();
      setInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!gradeLevel || !subject || !topic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to start your session.",
        variant: "destructive",
      });
      return;
    }

    createSessionMutation.mutate({
      gradeLevel,
      subject,
      topic: topic.trim(),
    });
  };

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

  const handleEndSession = () => {
    setShowSetup(true);
    setSessionData(null);
    onSessionChange?.(null);
  };

  if (showSetup) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <CardTitle>AI Tutor Session Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade-level">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger data-testid="select-grade-level">
                    <SelectValue placeholder="Select grade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">Elementary (K-5)</SelectItem>
                    <SelectItem value="middle">Middle School (6-8)</SelectItem>
                    <SelectItem value="high">High School (9-12)</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="computer-science">Computer Science</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="literature">Literature</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Linear Equations"
                  data-testid="input-topic"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
              className="w-full"
              data-testid="button-start-session"
            >
              {createSessionMutation.isPending ? "Starting..." : "Start Learning"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  // Convert tutor messages to chat message format
  const chatMessages = sessionData.messages.map(msg => ({
    id: msg.id,
    role: msg.role as 'tutor' | 'user',
    content: msg.content,
    createdAt: msg.createdAt,
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {sessionData.session.gradeLevel} • {sessionData.session.subject} • {sessionData.session.topic}
            </h2>
            <p className="text-sm text-muted-foreground">AI Tutor Session</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleEndSession}
            data-testid="button-end-session"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {chatMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* Loading indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <Card className="bg-accent p-3">
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </Card>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your solution or ask a question..."
            className="flex-1"
            data-testid="input-tutor"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!input.trim() || sendMessageMutation.isPending}
            data-testid="button-send-tutor"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
