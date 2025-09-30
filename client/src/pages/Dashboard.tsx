import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  StickyNote, 
  HelpCircle, 
  File,
  Presentation,
  FileImage,
  Video
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  // Fetch recent documents
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

  const getUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    const file = result.successful[0];
    if (!file) return;

    try {
      // Create file record
      await apiRequest('PUT', '/api/files', {
        fileURL: file.uploadURL,
        filename: file.name,
        originalName: file.name,
        fileType: file.type?.split('/')[1] || 'unknown',
        size: file.size,
        mimeType: file.type,
      });

      // Process document if it's a supported type
      const supportedTypes = ['pdf', 'pptx', 'docx', 'mp3', 'mp4'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension && supportedTypes.includes(fileExtension)) {
        await apiRequest('POST', '/api/documents/process', {
          sourceType: fileExtension,
          sourceUrl: file.uploadURL,
          title: file.name,
        });
      }

      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded and is being processed.",
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process uploaded file.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-600" />;
      case 'pptx': return <Presentation className="w-4 h-4 text-orange-600" />;
      case 'docx': return <File className="w-4 h-4 text-blue-600" />;
      case 'mp3': case 'wav': return <Video className="w-4 h-4 text-purple-600" />;
      case 'mp4': case 'mov': return <Video className="w-4 h-4 text-green-600" />;
      default: return <FileImage className="w-4 h-4 text-gray-600" />;
    }
  };

  const recentDocuments = documents?.slice(0, 3) || [];

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back!</h2>
            <p className="text-muted-foreground">
              Continue your learning journey
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={100 * 1024 * 1024} // 100MB
              onGetUploadParameters={getUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </ObjectUploader>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="stat-documents">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total uploaded
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-chats">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.chatSessionsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Conversations started
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-notes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notes Created</CardTitle>
              <StickyNote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.notesCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Notes written
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-quizzes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.quizzesCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Assessments completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Documents */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDocuments.length > 0 ? (
                  recentDocuments.map((doc: any) => (
                    <div 
                      key={doc.id}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setLocation('/chat')}
                      data-testid={`recent-doc-${doc.id}`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-background border rounded-lg">
                        {getFileIcon(doc.title)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()} • {doc.status}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setLocation('/chat')}
                data-testid="quick-action-chat"
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                Start Doc Chat
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setLocation('/tutor')}
                data-testid="quick-action-tutor"
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                AI Tutor Session
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setLocation('/notes')}
                data-testid="quick-action-notes"
              >
                <StickyNote className="w-4 h-4 mr-3" />
                Create Note
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setLocation('/quizzes')}
                data-testid="quick-action-quiz"
              >
                <HelpCircle className="w-4 h-4 mr-3" />
                Generate Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
