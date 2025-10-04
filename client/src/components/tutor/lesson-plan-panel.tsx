import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface LessonPlanPanelProps {
  config: {
    subject: string;
    level: string;
    topic: string;
    language: string;
    board: string;
  };
}

const planSteps = [
  {
    id: 'intro',
    title: 'Introduction',
    status: 'completed',
    duration: 8,
    icon: 'fas fa-play-circle',
  },
  {
    id: 'concepts',
    title: 'Core Concepts',
    status: 'active',
    duration: 15,
    icon: 'fas fa-lightbulb',
  },
  {
    id: 'practice',
    title: 'Practice Problems',
    status: 'pending',
    duration: 20,
    icon: 'fas fa-dumbbell',
  },
  {
    id: 'recap',
    title: 'Recap & Summary',
    status: 'pending',
    duration: 10,
    icon: 'fas fa-list-check',
  },
];

const learningObjectives = [
  { text: 'Understand moment of inertia', completed: true },
  { text: 'Apply torque equations', completed: true },
  { text: 'Solve angular momentum problems', completed: false, active: true },
  { text: 'Practice JEE-level questions', completed: false },
];

export default function LessonPlanPanel({ config }: LessonPlanPanelProps) {
  const completedSteps = planSteps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / planSteps.length) * 100;

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: 'fas fa-check-circle',
          bgColor: 'bg-green-50',
          borderColor: 'border-l-4 border-green-500',
          textColor: 'text-green-900',
          timeColor: 'text-green-700',
        };
      case 'active':
        return {
          icon: 'fas fa-spinner fa-spin',
          bgColor: 'bg-blue-50',
          borderColor: 'border-l-4 border-blue-500',
          textColor: 'text-blue-900',
          timeColor: 'text-blue-700',
        };
      default:
        return {
          icon: 'fas fa-circle',
          bgColor: 'bg-muted',
          borderColor: '',
          textColor: 'text-muted-foreground',
          timeColor: 'text-muted-foreground',
        };
    }
  };

  return (
    <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto custom-scrollbar">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Lesson Plan</h2>
          <Button variant="ghost" size="sm" data-testid="button-edit-plan">
            <i className="fas fa-edit text-muted-foreground"></i>
          </Button>
        </div>

        {/* Session Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <i className="fas fa-book text-primary mt-1"></i>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{config.subject}</p>
                <p className="text-xs text-muted-foreground">{config.topic}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <i className="fas fa-graduation-cap w-3"></i>
                <span>{config.level} • {config.board}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-language w-3"></i>
                <span>{config.language === 'en' ? 'English' : config.language === 'hi' ? 'Hindi' : 'Hinglish'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Progress Steps */}
        <div className="space-y-2">
          {planSteps.map((step) => {
            const status = getStepStatus(step.status);
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${status.bgColor} ${status.borderColor}`}
                data-testid={`lesson-step-${step.id}`}
              >
                <i className={`${status.icon} ${status.textColor}`}></i>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${status.textColor}`}>{step.title}</p>
                  <p className={`text-xs ${status.timeColor}`}>
                    {step.status === 'completed' ? `Completed ${step.duration} min ago` : 
                     step.status === 'active' ? 'In progress...' : 
                     `${step.duration} min planned`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Learning Objectives */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Learning Objectives</h3>
          <ul className="space-y-2">
            {learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2 text-sm" data-testid={`objective-${index}`}>
                {objective.completed ? (
                  <i className="fas fa-check text-green-600 mt-1"></i>
                ) : objective.active ? (
                  <i className="fas fa-arrow-right text-primary mt-1"></i>
                ) : (
                  <i className="fas fa-circle text-muted-foreground mt-1 text-xs"></i>
                )}
                <span className={
                  objective.completed ? 'text-muted-foreground' :
                  objective.active ? 'text-foreground font-medium' :
                  'text-muted-foreground'
                }>
                  {objective.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Time Spent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Session Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Spent</span>
              <span className="font-semibold text-foreground">24 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions Asked</span>
              <span className="font-semibold text-foreground">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-semibold text-green-600">85%</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-save-progress">
            <i className="fas fa-bookmark mr-2"></i>
            Save Progress
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10" data-testid="button-end-session">
            <i className="fas fa-stop-circle mr-2"></i>
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
}
