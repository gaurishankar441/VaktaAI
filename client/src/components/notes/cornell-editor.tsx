import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { ArrowLeft, Save, Share, FileText, Download, Plus, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface CornellEditorProps {
  noteId: string | null;
  onClose: () => void;
  onNoteCreated: (noteId: string) => void;
}

interface CornellNote {
  bigIdea: string;
  keyTerms: Array<{ term: string; definition: string }>;
  summary: string;
  sections: Array<{ heading: string; content: string }>;
  flashcards: Array<{ front: string; back: string }>;
}

const quickActions = [
  { id: 'audio', icon: 'fas fa-microphone', color: 'text-red-600', title: 'Audio → Note' },
  { id: 'video', icon: 'fab fa-youtube', color: 'text-red-600', title: 'Video → Note' },
  { id: 'url', icon: 'fas fa-globe', color: 'text-blue-600', title: 'URL → Note' },
];

export default function CornellEditor({ noteId, onClose, onNoteCreated }: CornellEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<CornellNote>({
    bigIdea: '',
    keyTerms: [],
    summary: '',
    sections: [],
    flashcards: []
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Fetch existing note if editing
  const { data: existingNote, isLoading } = useQuery({
    queryKey: ['/api/notes', noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const response = await apiRequest('GET', `/notes/${noteId}`);
      return response.json();
    },
    enabled: !!noteId
  });

  // Initialize form with existing data
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title || '');
      setContent(existingNote.content || {
        bigIdea: '',
        keyTerms: [],
        summary: '',
        sections: [],
        flashcards: []
      });
      setTags(existingNote.tags || []);
    }
  }, [existingNote]);

  // Auto-save mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      if (noteId) {
        const response = await apiRequest('PATCH', `/notes/${noteId}`, noteData);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/notes', {
          ...noteData,
          userId: 'default-user'
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (!noteId) {
        onNoteCreated(data.id);
      }
    }
  });

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim()) {
        setIsAutoSaving(true);
        saveNoteMutation.mutate({
          title,
          content,
          tags
        });
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, tags]);

  const handleAddKeyTerm = () => {
    setContent(prev => ({
      ...prev,
      keyTerms: [...prev.keyTerms, { term: '', definition: '' }]
    }));
  };

  const handleUpdateKeyTerm = (index: number, field: 'term' | 'definition', value: string) => {
    setContent(prev => ({
      ...prev,
      keyTerms: prev.keyTerms.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveKeyTerm = (index: number) => {
    setContent(prev => ({
      ...prev,
      keyTerms: prev.keyTerms.filter((_, i) => i !== index)
    }));
  };

  const handleAddSection = () => {
    setContent(prev => ({
      ...prev,
      sections: [...prev.sections, { heading: '', content: '' }]
    }));
  };

  const handleUpdateSection = (index: number, field: 'heading' | 'content', value: string) => {
    setContent(prev => ({
      ...prev,
      sections: prev.sections.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveSection = (index: number) => {
    setContent(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleRegenerateFlashcards = async () => {
    try {
      // TODO: Call API to regenerate flashcards based on current content
      console.log('Regenerating flashcards...');
    } catch (error) {
      console.error('Failed to regenerate flashcards:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      // TODO: Call API to export note as PDF
      console.log('Exporting as PDF...');
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    try {
      // TODO: Implement quick actions for audio, video, URL
      console.log(`Quick action: ${actionId}`);
    } catch (error) {
      console.error(`Failed to execute ${actionId}:`, error);
    }
  };

  const wordCount = content.summary.split(/\s+/).filter(word => word.length > 0).length;
  const keyTermCount = content.keyTerms.length;
  const flashcardCount = content.flashcards.length;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="text-lg font-bold bg-transparent border-none focus-visible:ring-0 p-0 h-auto"
              data-testid="input-note-title"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isAutoSaving ? 'Saving...' : 'Last saved 2 hours ago'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-share">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          
          <Button onClick={handleExportPDF} size="sm" data-testid="button-export-pdf">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cornell Editor */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Big Idea Section */}
            <Card className="bg-primary/5 border-l-4 border-primary">
              <CardContent className="p-6">
                <label className="block text-xs font-semibold text-primary mb-2">
                  BIG IDEA
                </label>
                <Textarea
                  value={content.bigIdea}
                  onChange={(e) => setContent(prev => ({ ...prev, bigIdea: e.target.value }))}
                  placeholder="Summarize the main concept in 3-5 lines..."
                  className="bg-transparent border-none resize-none focus-visible:ring-0 p-0"
                  rows={3}
                  data-testid="textarea-big-idea"
                />
              </CardContent>
            </Card>

            {/* Cornell Two-Column Layout */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Left: Key Terms */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    KEY TERMS
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddKeyTerm}
                    data-testid="button-add-key-term"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {content.keyTerms.map((keyTerm, index) => (
                    <Card key={index} className="bg-muted">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={keyTerm.term}
                            onChange={(e) => handleUpdateKeyTerm(index, 'term', e.target.value)}
                            placeholder="Term"
                            className="font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                            data-testid={`input-term-${index}`}
                          />
                          <Textarea
                            value={keyTerm.definition}
                            onChange={(e) => handleUpdateKeyTerm(index, 'definition', e.target.value)}
                            placeholder="Definition"
                            className="bg-transparent border-none resize-none p-0 focus-visible:ring-0"
                            rows={2}
                            data-testid={`textarea-definition-${index}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKeyTerm(index)}
                          className="mt-2 text-destructive hover:text-destructive"
                          data-testid={`button-remove-term-${index}`}
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Right: Detailed Notes */}
              <div className="col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    DETAILED NOTES
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSection}
                    data-testid="button-add-section"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Section
                  </Button>
                </div>

                {content.sections.map((section, index) => (
                  <Card key={index} className="border-border">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={section.heading}
                            onChange={(e) => handleUpdateSection(index, 'heading', e.target.value)}
                            placeholder="Section heading..."
                            className="font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                            data-testid={`input-section-heading-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSection(index)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-remove-section-${index}`}
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </Button>
                        </div>
                        
                        <Textarea
                          value={section.content}
                          onChange={(e) => handleUpdateSection(index, 'content', e.target.value)}
                          placeholder="Write your detailed notes here. You can use LaTeX for formulas like $E = mc^2$..."
                          className="bg-transparent border-none resize-none focus-visible:ring-0 p-0 min-h-[150px]"
                          data-testid={`textarea-section-content-${index}`}
                        />
                        
                        {section.content && (
                          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-2">
                              <i className="fas fa-eye mr-1"></i>Preview
                            </p>
                            <LaTeXRenderer content={section.content} className="text-sm text-blue-800" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {content.sections.length === 0 && (
                  <Card className="border-dashed border-2 border-muted-foreground/30">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Start adding sections to organize your notes</p>
                      <Button
                        variant="outline"
                        onClick={handleAddSection}
                        data-testid="button-add-first-section"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Section
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Summary Section */}
            <Card className="border-2 border-border">
              <CardContent className="p-6">
                <label className="block text-xs font-semibold text-muted-foreground mb-3">
                  SUMMARY (≤180 words)
                </label>
                <Textarea
                  value={content.summary}
                  onChange={(e) => setContent(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Write a concise summary of your notes..."
                  className="bg-transparent border-none resize-none focus-visible:ring-0 p-0"
                  rows={6}
                  data-testid="textarea-summary"
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{wordCount} words</span>
                  <span className={wordCount > 180 ? 'text-destructive' : ''}>
                    {wordCount > 180 ? 'Exceeds limit' : 'Within limit'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tags Section */}
            <Card>
              <CardContent className="p-6">
                <label className="block text-xs font-semibold text-muted-foreground mb-3">
                  TAGS
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                      data-testid={`badge-tag-${tag}`}
                    >
                      {tag}
                      <i className="fas fa-times ml-1 text-xs"></i>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1"
                    data-testid="input-new-tag"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    data-testid="button-add-tag"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated Flashcards Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    FLASHCARDS ({content.flashcards.length} pairs)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateFlashcards}
                    data-testid="button-regenerate-flashcards"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {content.flashcards.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {content.flashcards.slice(0, 4).map((card, index) => (
                      <Card key={index} className="hover:border-primary transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <p className="text-sm font-semibold text-foreground mb-2">
                            Q: {card.front}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            A: {card.back}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-layer-group text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground mb-4">No flashcards generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add content to your notes to automatically generate flashcards
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar: Quick Actions */}
        <div className="w-80 border-l border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
          
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="w-full justify-start hover:border-primary hover:bg-primary/5"
              onClick={() => handleQuickAction(action.id)}
              data-testid={`button-action-${action.id}`}
            >
              <i className={`${action.icon} ${action.color} mr-3`}></i>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground">
                  {action.id === 'audio' && 'Record lecture'}
                  {action.id === 'video' && 'Summarize YouTube'}
                  {action.id === 'url' && 'Summarize article'}
                </p>
              </div>
            </Button>
          ))}

          <Separator />

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start hover:border-primary hover:bg-primary/5"
              data-testid="button-generate-flashcards"
            >
              <i className="fas fa-clone text-green-600 mr-3"></i>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Generate Flashcards</p>
                <p className="text-xs text-muted-foreground">Create study cards</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start hover:border-primary hover:bg-primary/5"
              data-testid="button-generate-quiz"
            >
              <i className="fas fa-circle-question text-purple-600 mr-3"></i>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Generate Quiz</p>
                <p className="text-xs text-muted-foreground">Test yourself</p>
              </div>
            </Button>
          </div>

          <Separator />

          {/* Note Statistics */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3">NOTE STATISTICS</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Words</span>
                <span className="font-semibold text-foreground">{wordCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Key Terms</span>
                <span className="font-semibold text-foreground">{keyTermCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Flashcards</span>
                <span className="font-semibold text-foreground">{flashcardCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tags</span>
                <span className="font-semibold text-foreground">{tags.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
