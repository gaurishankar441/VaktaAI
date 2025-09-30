import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Download, Share, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  title: string;
  content: string;
  templateType: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface NoteEditorProps {
  note?: Note;
  templateType: string;
  onSave?: (note: Note) => void;
  onClose?: () => void;
}

const NOTE_TEMPLATES = {
  blank: {
    title: "Untitled Note",
    content: "",
  },
  lecture: {
    title: "Lecture Notes",
    content: `# Lecture Title
**Date:** ${new Date().toLocaleDateString()}
**Course:** 
**Professor:** 

## Key Points
- 
- 
- 

## Detailed Notes


## Questions
- 
- 

## Action Items
- 
- `,
  },
  research: {
    title: "Research Paper Notes",
    content: `# Research Paper: [Title]
**Authors:** 
**Journal:** 
**Year:** 
**DOI:** 

## Abstract Summary


## Key Findings
- 
- 
- 

## Methodology


## Discussion Points


## References
- 
- `,
  },
  review: {
    title: "Review Essay Notes",
    content: `# Review Essay: [Topic]
**Date:** ${new Date().toLocaleDateString()}

## Thesis Statement


## Main Arguments
### Argument 1


### Argument 2


### Argument 3


## Evidence and Examples
- 
- 
- 

## Counterarguments


## Conclusion`,
  },
  summary: {
    title: "Article Summary",
    content: `# Article Summary: [Title]
**Source:** 
**Author:** 
**Date:** 
**URL:** 

## Main Points
- 
- 
- 

## Key Quotes
> "Quote 1"

> "Quote 2"

## Personal Thoughts


## Related Topics
- 
- `,
  },
};

export function NoteEditor({ note, templateType, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setWordCount(note.wordCount || 0);
    } else {
      const template = NOTE_TEMPLATES[templateType as keyof typeof NOTE_TEMPLATES] || NOTE_TEMPLATES.blank;
      setTitle(template.title);
      setContent(template.content);
    }
  }, [note, templateType]);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setHasUnsavedChanges(true);
  }, [content, title]);

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const noteData = {
        title,
        content,
        templateType,
        wordCount,
      };

      if (note?.id) {
        const response = await apiRequest('PUT', `/api/notes/${note.id}`, noteData);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/notes', noteData);
        return response.json();
      }
    },
    onSuccess: (savedNote) => {
      setHasUnsavedChanges(false);
      onSave?.(savedNote);
      toast({
        title: "Note Saved",
        description: "Your note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please add a title to your note.",
        variant: "destructive",
      });
      return;
    }
    saveNoteMutation.mutate();
  };

  const handleExport = (format: 'md' | 'txt') => {
    const exportContent = format === 'md' ? content : content.replace(/[#*>`-]/g, '');
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'lecture': return '🎓';
      case 'research': return '🔬';
      case 'review': return '📝';
      case 'summary': return '📋';
      default: return '📄';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTemplateIcon(templateType)}</span>
            <div>
              <Badge variant="outline" className="mb-1">
                {templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template
              </Badge>
              <p className="text-sm text-muted-foreground">
                {wordCount} words • {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveNoteMutation.isPending}
              data-testid="button-save-note"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveNoteMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-note-menu">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('md')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="w-4 h-4 mr-2" />
                  Share Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-note">
                ×
              </Button>
            )}
          </div>
        </div>
        
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-xl font-semibold border-none px-0 focus-visible:ring-0"
          data-testid="input-note-title"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 p-6">
        <Card className="h-full">
          <CardContent className="p-6 h-full">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note..."
              className="h-full min-h-[500px] resize-none border-none focus-visible:ring-0 text-base leading-relaxed"
              data-testid="textarea-note-content"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
