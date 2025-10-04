import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { uploadFile, apiRequest } from '@/lib/api';

interface DocumentSourcesProps {
  documents: any[];
  selectedDocuments: string[];
  onDocumentSelect: (documentId: string) => void;
  onSelectionChange: (documentIds: string[]) => void;
  isLoading: boolean;
}

export default function DocumentSources({
  documents,
  selectedDocuments,
  onDocumentSelect,
  onSelectionChange,
  isLoading
}: DocumentSourcesProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('type', 'pdf');
      formData.append('userId', 'default-user');

      await uploadFile(file, '/documents/upload');
      
      // Refresh documents list (would be handled by parent component's refetch)
      window.location.reload();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    setIsAddingUrl(true);
    try {
      await apiRequest('POST', '/documents/by-url', {
        url: urlInput,
        title: urlInput,
        type: urlInput.includes('youtube.com') ? 'youtube' : 'url',
        userId: 'default-user'
      });
      
      setUrlInput('');
      // Refresh documents list (would be handled by parent component's refetch)
      window.location.reload();
    } catch (error) {
      console.error('Failed to add URL:', error);
    } finally {
      setIsAddingUrl(false);
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = selectedDocuments.includes(documentId)
      ? selectedDocuments.filter(id => id !== documentId)
      : [...selectedDocuments, documentId];
    onSelectionChange(newSelection);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-600';
      case 'youtube':
        return 'fab fa-youtube text-red-600';
      case 'url':
        return 'fas fa-globe text-blue-600';
      default:
        return 'fas fa-file text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-600';
      case 'processing':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-foreground mb-4">Document Sources</h2>
        
        {/* Upload Actions */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
              data-testid="input-file-upload"
            />
            <Button
              variant="outline"
              className="w-full justify-start border-dashed hover:border-primary hover:bg-primary/5"
              disabled={isUploading}
              data-testid="button-upload-pdf"
            >
              <i className="fas fa-file-pdf text-red-600 mr-2"></i>
              <span className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </span>
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="YouTube URL or webpage..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
              data-testid="input-url"
            />
            <Button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || isAddingUrl}
              size="sm"
              data-testid="button-add-url"
            >
              {isAddingUrl ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-plus"></i>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Documents List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : documents.length > 0 ? (
          documents.map((document) => (
            <Card
              key={document.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedDocuments.includes(document.id) ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => {
                onDocumentSelect(document.id);
                toggleDocumentSelection(document.id);
              }}
              data-testid={`card-document-${document.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <i className={getDocumentIcon(document.type)}></i>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {document.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {document.pages ? `${document.pages} pages` : ''} 
                      {document.pages && document.tokens ? ' • ' : ''}
                      {document.tokens ? `${Math.round(document.tokens / 1000)}k tokens` : ''}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {document.status === 'processing' ? (
                        <>
                          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden relative">
                            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '65%' }}></div>
                          </div>
                          <span className="text-xs text-orange-600 font-medium">Processing...</span>
                        </>
                      ) : (
                        <span className={`text-xs font-medium ${getStatusColor(document.status)}`}>
                          {document.status === 'ready' ? 'Ready' : 
                           document.status === 'error' ? 'Error' : 
                           document.status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedDocuments.includes(document.id) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <i className="fas fa-check text-primary-foreground text-xs"></i>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-folder-open text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-sm font-semibold text-foreground mb-2">No Documents</h3>
            <p className="text-xs text-muted-foreground">
              Upload PDFs or add URLs to start chatting with your documents
            </p>
          </div>
        )}
      </div>
      
      {/* Selection Summary */}
      {selectedDocuments.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="w-full"
            data-testid="button-clear-selection"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}
