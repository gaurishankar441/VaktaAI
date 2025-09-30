import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FileManager } from "@/components/resources/FileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  fileType: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Resources() {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();

  // Fetch recently viewed files
  const { data: recentFiles } = useQuery({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await fetch('/api/files', {
        credentials: 'include',
      });
      return response.json();
    },
  });

  const handleFileSelect = (file: FileItem) => {
    // Handle file selection - could open preview, start chat, etc.
    console.log('Selected file:', file);
  };

  const getFileIcon = (fileType: string, mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (fileType === 'pdf') return '📄';
    if (fileType === 'pptx') return '📊';
    if (fileType === 'docx') return '📝';
    return '📁';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const recentlyViewed = recentFiles?.slice(0, 5) || [];

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
            <p className="text-muted-foreground">
              Manage your documents and files
            </p>
          </div>

          {/* File Manager */}
          <FileManager
            currentFolderId={currentFolderId}
            onFolderChange={setCurrentFolderId}
            onFileSelect={handleFileSelect}
          />

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Viewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentlyViewed.map((file: FileItem) => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleFileSelect(file)}
                      data-testid={`recent-file-${file.id}`}
                    >
                      <div className="text-2xl">
                        {getFileIcon(file.fileType, file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.originalName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(file.updatedAt).toLocaleDateString()} • {formatFileSize(file.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Start chat with document
                          }}
                          data-testid={`chat-${file.id}`}
                        >
                          💬
                        </button>
                        <button 
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download file
                          }}
                          data-testid={`download-${file.id}`}
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
