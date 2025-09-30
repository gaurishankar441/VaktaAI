import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Mic, Search, Edit, List, X } from "lucide-react";

interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with a clean slate',
    icon: <FileText className="w-6 h-6 text-gray-600" />,
  },
  {
    id: 'lecture',
    name: 'Record Lecture',
    description: 'Template for lecture notes with sections',
    icon: <Mic className="w-6 h-6 text-blue-600" />,
  },
  {
    id: 'research',
    name: 'Research Paper',
    description: 'Structured template for research',
    icon: <Search className="w-6 h-6 text-green-600" />,
  },
  {
    id: 'review',
    name: 'Review Essay',
    description: 'Template for essay writing and reviews',
    icon: <Edit className="w-6 h-6 text-purple-600" />,
  },
  {
    id: 'summary',
    name: 'Summarise Article',
    description: 'Template for article summaries',
    icon: <List className="w-6 h-6 text-orange-600" />,
  },
];

interface NoteTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export function NoteTemplateSelector({ open, onClose, onSelectTemplate }: NoteTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    onSelectTemplate(templateId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Choose Note Template</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="button-close-template-selector"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {NOTE_TEMPLATES.map((template) => (
            <Card 
              key={template.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelectTemplate(template.id)}
              data-testid={`template-${template.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center border">
                    {template.icon}
                  </div>
                  <h3 className="font-medium">{template.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
