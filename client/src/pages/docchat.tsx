import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DocumentSources from '@/components/docchat/document-sources';
import PDFViewer from '@/components/docchat/pdf-viewer';
import ChatPanel from '@/components/docchat/chat-panel';
import { apiRequest } from '@/lib/api';

export default function DocChatPage() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Fetch user documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/documents');
      return response.json();
    }
  });

  const handleDocumentSelect = (documentId: string) => {
    setCurrentDocument(documentId);
    if (!selectedDocuments.includes(documentId)) {
      setSelectedDocuments(prev => [...prev, documentId]);
    }
  };

  const handleStartChat = async () => {
    try {
      const response = await apiRequest('POST', '/chats', {
        mode: 'docchat',
        userId: 'default-user',
        language: 'en',
        metadata: {
          documentIds: selectedDocuments
        }
      });
      const chatSession = await response.json();
      setActiveChatId(chatSession.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Left: Document Sources */}
      <DocumentSources
        documents={documents || []}
        selectedDocuments={selectedDocuments}
        onDocumentSelect={handleDocumentSelect}
        onSelectionChange={setSelectedDocuments}
        isLoading={isLoading}
      />

      {/* Center: PDF Viewer */}
      <PDFViewer
        documentId={currentDocument}
        documents={documents || []}
      />

      {/* Right: Chat Panel */}
      <ChatPanel
        chatId={activeChatId}
        selectedDocuments={selectedDocuments}
        onStartChat={handleStartChat}
        hasDocuments={selectedDocuments.length > 0}
      />
    </div>
  );
}
