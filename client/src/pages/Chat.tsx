import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatThread {
  id: string;
  title?: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function Chat() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const { toast } = useToast();

  // Fetch chat threads
  const { data: threads = [] } = useQuery<ChatThread[]>({
    queryKey: ['/api/chat/threads'],
  });

  // Fetch available documents
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const createThreadMutation = useMutation({
    mutationFn: async (documentIds: string[]) => {
      const response = await apiRequest('POST', '/api/chat/threads', {
        documentIds,
        title: `Chat with ${documentIds.length} document${documentIds.length > 1 ? 's' : ''}`,
      });
      return response.json();
    },
    onSuccess: (newThread) => {
      setSelectedThreadId(newThread.id);
      setShowDocumentSelector(false);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/threads'] });
      toast({
        title: "Chat Started",
        description: "New chat thread has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chat thread. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartNewChat = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to start chatting.",
        variant: "destructive",
      });
      return;
    }
    createThreadMutation.mutate(selectedDocuments);
  };

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const availableDocuments = documents.filter((doc: Document) => doc.status === 'indexed');

  // If no thread selected, show thread selection
  if (!selectedThreadId) {
    return (
      <MainLayout>
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Document Chat</h1>
                <p className="text-muted-foreground">
                  Chat with your documents using AI
                </p>
              </div>
              <Button 
                onClick={() => setShowDocumentSelector(true)}
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* Document Selector */}
            {showDocumentSelector && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Select Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      {availableDocuments.length > 0 ? (
                        availableDocuments.map((doc: Document) => (
                          <div 
                            key={doc.id}
                            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedDocuments.includes(doc.id) 
                                ? 'bg-primary/10 border-primary' 
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => handleDocumentToggle(doc.id)}
                            data-testid={`document-${doc.id}`}
                          >
                            <div className="w-4 h-4 border-2 rounded flex items-center justify-center">
                              {selectedDocuments.includes(doc.id) && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline">{doc.status}</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No processed documents available</p>
                          <p className="text-sm text-muted-foreground">Upload some documents first</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={handleStartNewChat}
                        disabled={selectedDocuments.length === 0 || createThreadMutation.isPending}
                        data-testid="button-start-chat"
                      >
                        {createThreadMutation.isPending ? "Creating..." : "Start Chat"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDocumentSelector(false);
                          setSelectedDocuments([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Threads */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Chats</h2>
              <div className="space-y-3">
                {threads && threads.length > 0 ? (
                  threads.map((thread: ChatThread) => (
                    <Card 
                      key={thread.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setSelectedThreadId(thread.id)}
                      data-testid={`thread-${thread.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{thread.title || 'Untitled Chat'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {thread.documentIds.length} document{thread.documentIds.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(thread.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No chat history</h3>
                      <p className="text-muted-foreground">Start your first conversation with your documents</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show chat interface for selected thread
  const selectedThread = threads.find((t: ChatThread) => t.id === selectedThreadId);
  
  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        <ChatInterface 
          threadId={selectedThreadId}
          documentIds={selectedThread?.documentIds || []}
        />
      </div>
    </MainLayout>
  );
}
