import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface QuickActionsDrawerProps {
  onClose: () => void;
}

const quickTools = [
  {
    id: 'explain',
    icon: 'fas fa-lightbulb',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    title: 'Explain Concept',
    description: 'Get detailed explanation of current topic',
  },
  {
    id: 'hint',
    icon: 'fas fa-compass',
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    title: 'Give Hint',
    description: 'Socratic hint for the last question',
  },
  {
    id: 'example',
    icon: 'fas fa-flask',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    title: 'Show Example',
    description: 'Worked example problem',
  },
  {
    id: 'practice',
    icon: 'fas fa-dumbbell',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    title: 'Practice 5 Qs',
    description: 'Quick practice quiz',
  },
  {
    id: 'summary',
    icon: 'fas fa-list-check',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-100',
    title: 'Get Summary',
    description: 'Recap of last 10 messages',
  },
];

export default function QuickActionsDrawer({ onClose }: QuickActionsDrawerProps) {
  const handleToolClick = (toolId: string) => {
    console.log(`Quick tool clicked: ${toolId}`);
    // TODO: Implement tool functionality
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col drawer-slide-in">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Quick Tools</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="w-8 h-8"
        >
          <i className="fas fa-times text-muted-foreground"></i>
        </Button>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
        {quickTools.map((tool) => (
          <Button
            key={tool.id}
            variant="outline"
            className="w-full h-auto p-4 justify-start hover:border-primary hover:bg-primary/5 group"
            onClick={() => handleToolClick(tool.id)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className={`w-10 h-10 rounded-lg ${tool.iconBg} flex items-center justify-center flex-shrink-0 group-hover:${tool.iconBg.replace('100', '200')} transition-colors`}>
                <i className={`${tool.icon} ${tool.iconColor}`}></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-foreground mb-1">{tool.title}</h3>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <i className="fas fa-chevron-right text-muted-foreground text-sm mt-1"></i>
            </div>
          </Button>
        ))}

        {/* Session Stats */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">SESSION STATS</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Time Spent</span>
              <span className="text-sm font-semibold text-foreground">24 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Questions Asked</span>
              <span className="text-sm font-semibold text-foreground">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Accuracy</span>
              <span className="text-sm font-semibold text-green-600">85%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
        >
          <i className="fas fa-stop-circle mr-2"></i>End Session
        </Button>
        <Button variant="outline" className="w-full">
          <i className="fas fa-bookmark mr-2"></i>Save Progress
        </Button>
      </div>
    </aside>
  );
}
