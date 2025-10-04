import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CornellEditor from '@/components/notes/cornell-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  // Fetch user's notes
  const { data: notes, refetch } = useQuery({
    queryKey: ['/api/notes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/notes');
      return response.json();
    }
  });

  const handleCreateNote = () => {
    setSelectedNoteId(null);
    setShowEditor(true);
  };

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    setShowEditor(true);
  };

  const handleNoteCreated = (noteId: string) => {
    setSelectedNoteId(noteId);
    refetch();
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedNoteId(null);
    refetch();
  };

  const filteredNotes = notes?.filter((note: any) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (Array.isArray(note.tags) && note.tags.some((tag: string) => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  ) || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showEditor) {
    return (
      <CornellEditor
        noteId={selectedNoteId}
        onClose={handleCloseEditor}
        onNoteCreated={handleNoteCreated}
      />
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-2">
              Create and organize your study notes with Cornell-style formatting
            </p>
          </div>
          <Button onClick={handleCreateNote} data-testid="button-create-note">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notes by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-notes"
          />
        </div>

        {/* Notes Grid */}
        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note: any) => (
              <Card
                key={note.id}
                className="cursor-pointer hover:border-primary transition-all hover-lift"
                onClick={() => handleNoteSelect(note.id)}
                data-testid={`card-note-${note.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(note.updatedAt || note.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Preview of big idea */}
                  {note.content?.bigIdea && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {note.content.bigIdea}
                    </p>
                  )}
                  
                  {/* Tags */}
                  {Array.isArray(note.tags) && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.slice(0, 3).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {note.content?.keyTerms && (
                        <span>
                          <i className="fas fa-key mr-1"></i>
                          {Array.isArray(note.content.keyTerms) ? note.content.keyTerms.length : 0} terms
                        </span>
                      )}
                      {note.flashcards && (
                        <span>
                          <i className="fas fa-layer-group mr-1"></i>
                          {Array.isArray(note.flashcards) ? note.flashcards.length : 0} cards
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="text-muted-foreground mb-8">
              {searchQuery 
                ? `No notes match "${searchQuery}". Try a different search term.`
                : 'Create your first note to start organizing your learning.'
              }
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateNote} className="px-8 py-3 text-lg">
                <Plus className="w-5 h-5 mr-3" />
                Create First Note
              </Button>
            )}
          </div>
        )}

        {/* Template Suggestions */}
        {!searchQuery && filteredNotes.length === 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-foreground mb-4">Note Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: 'fas fa-microphone', title: 'Record Lecture', desc: 'Audio to notes' },
                { icon: 'fas fa-file-alt', title: 'Research Paper', desc: 'Academic format' },
                { icon: 'fas fa-pen-fancy', title: 'Review Essay', desc: 'Critical analysis' },
                { icon: 'fas fa-globe', title: 'Summarize Article', desc: 'Web content' },
              ].map((template, index) => (
                <Card key={index} className="cursor-pointer hover:border-primary">
                  <CardContent className="p-4 text-center">
                    <i className={`${template.icon} text-2xl text-primary mb-2`}></i>
                    <h4 className="font-semibold text-foreground">{template.title}</h4>
                    <p className="text-sm text-muted-foreground">{template.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
