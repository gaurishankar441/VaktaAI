import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { queryClient } from "@/lib/queryClient";
import { NoteTemplateSelector } from "@/components/notes/NoteTemplateSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search, 
  Plus, 
  FileText, 
  Mic, 
  BookOpen, 
  Edit, 
  List,
  MoreHorizontal,
  Calendar,
  Clock
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content?: string;
  templateType: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Fetch notes
  const { data: notes } = useQuery({
    queryKey: ['/api/notes', searchQuery ? { search: searchQuery } : {}],
    queryFn: async () => {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/notes${params}`, {
        credentials: 'include',
      });
      return response.json();
    },
  });

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'lecture': return <Mic className="w-4 h-4 text-blue-600" />;
      case 'research': return <BookOpen className="w-4 h-4 text-green-600" />;
      case 'review': return <Edit className="w-4 h-4 text-purple-600" />;
      case 'summary': return <List className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTemplateName = (template: string) => {
    switch (template) {
      case 'lecture': return 'Record Lecture';
      case 'research': return 'Research Paper';
      case 'review': return 'Review Essay';
      case 'summary': return 'Summarise Article';
      default: return 'Blank Note';
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSelectedNote(null);
    setShowTemplateSelector(false);
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    setSelectedTemplate("");
  };

  const handleNoteSave = () => {
    // Refresh notes list and close editor
    setSelectedNote(null);
    setSelectedTemplate("");
    // Invalidate cache to refresh note list with updated word count
    queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
  };

  const handleCloseEditor = () => {
    setSelectedNote(null);
    setSelectedTemplate("");
  };

  // Filter and sort notes
  const filteredNotes = notes?.filter((note: Note) => {
    const matchesTemplate = templateFilter === 'all' || note.templateType === templateFilter;
    return matchesTemplate;
  }) || [];

  // If editing a note or creating a new one
  if (selectedNote || selectedTemplate) {
    return (
      <MainLayout>
        <NoteEditor
          note={selectedNote || undefined}
          templateType={selectedTemplate || selectedNote?.templateType || 'blank'}
          onSave={handleNoteSave}
          onClose={handleCloseEditor}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
              <p className="text-muted-foreground">
                Organize your thoughts and research
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="pl-10 w-64"
                  data-testid="input-search-notes"
                />
              </div>
              <Button 
                onClick={() => setShowTemplateSelector(true)}
                data-testid="button-new-note"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                  <SelectItem value="modified">Recently Modified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Template:</span>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="blank">Blank Note</SelectItem>
                  <SelectItem value="lecture">Record Lecture</SelectItem>
                  <SelectItem value="research">Research Paper</SelectItem>
                  <SelectItem value="review">Review Essay</SelectItem>
                  <SelectItem value="summary">Summarise Article</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create New Note Card */}
            <Card 
              className="border-2 border-dashed border-border hover:bg-accent cursor-pointer transition-colors min-h-48 flex items-center justify-center"
              onClick={() => setShowTemplateSelector(true)}
              data-testid="card-create-note"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Create New Note</h3>
                <p className="text-sm text-muted-foreground">Choose a template to get started</p>
              </CardContent>
            </Card>

            {/* Note Cards */}
            {filteredNotes.map((note: Note) => (
              <Card 
                key={note.id}
                className="hover:shadow-md transition-shadow cursor-pointer min-h-48"
                onClick={() => handleNoteSelect(note)}
                data-testid={`note-${note.id}`}
              >
                <CardContent className="p-4 flex flex-col h-full min-h-48">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-background rounded flex items-center justify-center border">
                        {getTemplateIcon(note.templateType)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getTemplateName(note.templateType)}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleNoteSelect(note)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <FileText className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-2 line-clamp-2">{note.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {note.content ? 
                        note.content.replace(/[#*>`-]/g, '').substring(0, 100) + '...' :
                        'No content yet...'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span>{note.wordCount} words</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first note to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowTemplateSelector(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Note
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Selector Modal */}
      <NoteTemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </MainLayout>
  );
}
