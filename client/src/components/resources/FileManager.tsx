import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Search,
  Folder,
  FolderPlus,
  Upload,
  FileText,
  File,
  Video,
  Music,
  Image,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface FileManagerProps {
  currentFolderId?: string;
  onFolderChange?: (folderId?: string) => void;
  onFileSelect?: (file: FileItem) => void;
}

export function FileManager({ currentFolderId, onFolderChange, onFileSelect }: FileManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const { toast } = useToast();

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ['/api/folders', currentFolderId ? { parentId: currentFolderId } : {}],
    queryFn: async () => {
      const params = currentFolderId ? `?parentId=${currentFolderId}` : '';
      const response = await fetch(`/api/folders${params}`, {
        credentials: 'include',
      });
      return response.json();
    },
  });

  // Fetch files
  const { data: files } = useQuery({
    queryKey: ['/api/files', currentFolderId ? { folderId: currentFolderId } : {}],
    queryFn: async () => {
      const params = currentFolderId ? `?folderId=${currentFolderId}` : '';
      const response = await fetch(`/api/files${params}`, {
        credentials: 'include',
      });
      return response.json();
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/folders', {
        name,
        parentId: currentFolderId,
      });
      return response.json();
    },
    onSuccess: () => {
      setNewFolderName("");
      setShowNewFolderInput(false);
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder Created",
        description: "New folder has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const response = await apiRequest('DELETE', `/api/folders/${folderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder Deleted",
        description: "Folder has been deleted successfully.",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "File Deleted",
        description: "File has been deleted successfully.",
      });
    },
  });

  const handleUploadComplete = async (result: any) => {
    const file = result.successful[0];
    if (!file) return;

    try {
      const response = await apiRequest('PUT', '/api/files', {
        fileURL: file.uploadURL,
        filename: file.name,
        originalName: file.name,
        fileType: file.type || 'unknown',
        size: file.size,
        mimeType: file.type,
        folderId: currentFolderId,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "File Uploaded",
        description: "File has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process uploaded file.",
        variant: "destructive",
      });
    }
  };

  const getUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const getFileIcon = (fileType: string, mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="w-5 h-5 text-green-600" />;
    if (mimeType?.startsWith('video/')) return <Video className="w-5 h-5 text-purple-600" />;
    if (mimeType?.startsWith('audio/')) return <Music className="w-5 h-5 text-blue-600" />;
    if (fileType === 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  const handleFolderClick = (folder: FolderItem) => {
    onFolderChange?.(folder.id);
  };

  const filteredFiles = files?.filter((file: FileItem) => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || file.fileType === fileTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a folder..."
            className="pl-10"
            data-testid="input-search-files"
          />
        </div>
        
        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="pptx">PowerPoint</SelectItem>
            <SelectItem value="docx">Word Documents</SelectItem>
            <SelectItem value="mp3">Audio</SelectItem>
            <SelectItem value="mp4">Video</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="size">Sort by Size</SelectItem>
            <SelectItem value="type">Sort by Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => onFolderChange?.()}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === folderPath.length - 1 ? (
                    <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink onClick={() => onFolderChange?.(folder.id)}>
                      {folder.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowNewFolderInput(true)}
          data-testid="button-create-folder"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
        
        <ObjectUploader
          maxNumberOfFiles={5}
          maxFileSize={100 * 1024 * 1024} // 100MB
          onGetUploadParameters={getUploadParameters}
          onComplete={handleUploadComplete}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Files
        </ObjectUploader>
      </div>

      {/* New Folder Input */}
      {showNewFolderInput && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolderInput(false);
                }}
                data-testid="input-folder-name"
              />
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                data-testid="button-confirm-create-folder"
              >
                Create
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {/* Folders */}
        {folders?.map((folder: FolderItem) => (
          <Card 
            key={folder.id}
            className="cursor-pointer hover:bg-accent transition-colors group"
            onClick={() => handleFolderClick(folder)}
            data-testid={`folder-${folder.name}`}
          >
            <CardContent className="p-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 w-6 h-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolderMutation.mutate(folder.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm font-medium truncate">{folder.name}</p>
              <p className="text-xs text-muted-foreground">Folder</p>
            </CardContent>
          </Card>
        ))}

        {/* Files */}
        {filteredFiles?.map((file: FileItem) => (
          <Card 
            key={file.id}
            className="cursor-pointer hover:bg-accent transition-colors group"
            onClick={() => onFileSelect?.(file)}
            data-testid={`file-${file.originalName}`}
          >
            <CardContent className="p-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  {getFileIcon(file.fileType, file.mimeType)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 w-6 h-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat with Document
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFileMutation.mutate(file.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm font-medium truncate">{file.originalName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {(!folders || folders.length === 0) && (!filteredFiles || filteredFiles.length === 0) && (
        <div className="text-center py-12">
          <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No files or folders</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first file or create a folder to get started.
          </p>
        </div>
      )}
    </div>
  );
}
