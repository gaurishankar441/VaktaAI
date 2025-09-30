import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Presentation, File, Video, Trash2, Eye, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Documents() {
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  const handleDelete = async (documentId: string) => {
    try {
      await apiRequest('DELETE', `/api/documents/${documentId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Document Deleted",
        description: "The document has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (sourceType: string) => {
    switch (sourceType?.toLowerCase()) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
      case 'pptx': return <Presentation className="w-5 h-5 text-orange-600" />;
      case 'docx': return <File className="w-5 h-5 text-blue-600" />;
      case 'mp3': case 'wav': return <Video className="w-5 h-5 text-purple-600" />;
      case 'mp4': case 'mov': case 'youtube': return <Video className="w-5 h-5 text-green-600" />;
      case 'url': return <File className="w-5 h-5 text-cyan-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      processing: { variant: "secondary", label: "Processing" },
      pending: { variant: "outline", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };
    
    const config = variants[status?.toLowerCase()] || { variant: "outline", label: status };
    return <Badge variant={config.variant as any} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 p-8">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight" data-testid="heading-documents">Documents</h2>
            <p className="text-muted-foreground">
              Manage your uploaded documents and learning materials
            </p>
          </div>
        </div>

        {!documents || documents.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first document to get started
                </p>
                <Button onClick={() => window.location.href = '/dashboard'} data-testid="button-go-dashboard">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc: any) => (
              <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.sourceType)}
                      <CardTitle className="text-base" data-testid={`text-title-${doc.id}`}>
                        {doc.title || 'Untitled Document'}
                      </CardTitle>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  <CardDescription className="line-clamp-2" data-testid={`text-description-${doc.id}`}>
                    {doc.metadata?.description || doc.metadata?.author || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground flex items-center justify-between">
                      <span>Type: {doc.sourceType?.toUpperCase() || 'Unknown'}</span>
                      {doc.metadata?.pages && (
                        <span>{doc.metadata.pages} pages</span>
                      )}
                      {doc.metadata?.duration && (
                        <span>{Math.floor(doc.metadata.duration / 60)}m</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Uploaded {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </div>
                    
                    {doc.processingError && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded" data-testid={`text-error-${doc.id}`}>
                        Error: {doc.processingError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => window.location.href = `/chat?document=${doc.id}`}
                        data-testid={`button-chat-${doc.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            data-testid={`button-delete-${doc.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${doc.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(doc.id)}
                              data-testid={`button-confirm-delete-${doc.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
