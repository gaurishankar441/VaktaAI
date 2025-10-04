import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StreamingText } from '@/components/ui/streaming-text';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { apiRequest } from '@/lib/api';

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

export default function QuickTools() {
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  
  // Form states
  const [explainConcept, setExplainConcept] = useState('');
  const [explainDepth, setExplainDepth] = useState('standard');
  const [exampleTopic, setExampleTopic] = useState('');
  const [exampleDifficulty, setExampleDifficulty] = useState('standard');

  const handleToolAction = async (toolId: string, params?: any) => {
    setIsLoading(true);
    setResult('');

    try {
      let response;
      
      switch (toolId) {
        case 'explain':
          response = await apiRequest('POST', '/tools/explain', {
            concept: params.concept || explainConcept,
            depth: params.depth || explainDepth,
          });
          break;
          
        case 'hint':
          response = await apiRequest('POST', '/tools/hint', {
            question: params.question || 'Current question',
          });
          break;
          
        case 'example':
          response = await apiRequest('POST', '/tools/example', {
            topic: params.topic || exampleTopic,
            difficulty: params.difficulty || exampleDifficulty,
          });
          break;
          
        case 'summary':
          response = await apiRequest('POST', '/tools/summary', {
            messages: params.messages || ['Recent chat messages'],
          });
          break;
          
        default:
          throw new Error('Unknown tool');
      }

      const data = await response.json();
      setResult(data.explanation || data.hint || data.example || data.summary || 'Result generated');
    } catch (error) {
      console.error('Tool action failed:', error);
      setResult('Failed to generate result. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderExplainPopover = () => (
    <PopoverContent className="w-96 p-0" data-testid="popover-explain">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">Explain Concept</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Explanation Depth</label>
          <div className="flex gap-2">
            {['quick', 'standard', 'deep'].map((depth) => (
              <Button
                key={depth}
                variant={explainDepth === depth ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExplainDepth(depth)}
                className="flex-1 capitalize"
                data-testid={`button-depth-${depth}`}
              >
                {depth}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Concept</label>
          <Input
            type="text"
            value={explainConcept}
            onChange={(e) => setExplainConcept(e.target.value)}
            placeholder="Enter concept to explain..."
            data-testid="input-concept"
          />
        </div>
        
        <Button
          onClick={() => handleToolAction('explain')}
          disabled={!explainConcept || isLoading}
          className="w-full"
          data-testid="button-generate-explanation"
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Generating...
            </>
          ) : (
            <>
              <i className="fas fa-wand-magic-sparkles mr-2"></i>
              Generate Explanation
            </>
          )}
        </Button>
        
        {/* Results */}
        {result && (
          <div className="mt-4 p-3 rounded-lg bg-muted max-h-64 overflow-y-auto">
            <LaTeXRenderer content={result} className="text-sm" />
          </div>
        )}
      </div>
    </PopoverContent>
  );

  const renderExamplePopover = () => (
    <PopoverContent className="w-96 p-0" data-testid="popover-example">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">Show Example</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Topic</label>
          <Input
            type="text"
            value={exampleTopic}
            onChange={(e) => setExampleTopic(e.target.value)}
            placeholder="Enter topic for example..."
            data-testid="input-example-topic"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Difficulty</label>
          <Select value={exampleDifficulty} onValueChange={setExampleDifficulty}>
            <SelectTrigger data-testid="select-example-difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="jee">JEE Level</SelectItem>
              <SelectItem value="neet">NEET Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={() => handleToolAction('example')}
          disabled={!exampleTopic || isLoading}
          className="w-full"
          data-testid="button-generate-example"
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Generating...
            </>
          ) : (
            <>
              <i className="fas fa-flask mr-2"></i>
              Generate Example
            </>
          )}
        </Button>
        
        {/* Results */}
        {result && (
          <div className="mt-4 p-3 rounded-lg bg-muted max-h-64 overflow-y-auto">
            <LaTeXRenderer content={result} className="text-sm" />
          </div>
        )}
      </div>
    </PopoverContent>
  );

  return (
    <div className="space-y-3">
      {quickTools.map((tool) => {
        if (tool.id === 'explain') {
          return (
            <Popover key={tool.id} open={activePopover === tool.id} onOpenChange={(open) => setActivePopover(open ? tool.id : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 justify-start hover:border-primary hover:bg-primary/5 group"
                  data-testid={`button-tool-${tool.id}`}
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
              </PopoverTrigger>
              {renderExplainPopover()}
            </Popover>
          );
        }

        if (tool.id === 'example') {
          return (
            <Popover key={tool.id} open={activePopover === tool.id} onOpenChange={(open) => setActivePopover(open ? tool.id : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 justify-start hover:border-primary hover:bg-primary/5 group"
                  data-testid={`button-tool-${tool.id}`}
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
              </PopoverTrigger>
              {renderExamplePopover()}
            </Popover>
          );
        }

        // Simple action tools
        return (
          <Button
            key={tool.id}
            variant="outline"
            className="w-full h-auto p-4 justify-start hover:border-primary hover:bg-primary/5 group"
            onClick={() => handleToolAction(tool.id)}
            disabled={isLoading}
            data-testid={`button-tool-${tool.id}`}
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
        );
      })}
    </div>
  );
}
