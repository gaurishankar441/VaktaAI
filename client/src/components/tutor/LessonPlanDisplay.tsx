import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Target, CheckCircle2, Clock } from "lucide-react";

interface LessonStep {
  type: string;
  content: string;
  bloomLevel: string;
  checkpoints: string[];
  estimatedMinutes: number;
}

interface LessonPlan {
  learningGoals: string[];
  targetBloomLevel: string;
  priorKnowledgeCheck: string;
  steps: LessonStep[];
  resources: string[];
  estimatedDuration: number;
}

interface LessonPlanDisplayProps {
  lessonPlan: LessonPlan;
}

const bloomLevelColors: Record<string, string> = {
  remember: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  understand: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  apply: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  analyze: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  evaluate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  create: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

const stepTypeIcons: Record<string, string> = {
  explain: "📚",
  example: "💡",
  practice: "✏️",
  reflection: "🤔",
  probe: "❓",
};

export function LessonPlanDisplay({ lessonPlan }: LessonPlanDisplayProps) {
  return (
    <Card className="border-primary/20" data-testid="lesson-plan-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Plan
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lessonPlan.estimatedDuration} min
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Learning Goals */}
        <div data-testid="learning-goals">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Target className="h-4 w-4" />
            Learning Goals
          </h3>
          <ul className="space-y-1">
            {lessonPlan.learningGoals.map((goal, idx) => (
              <li 
                key={idx} 
                className="text-sm text-muted-foreground flex items-start gap-2"
                data-testid={`learning-goal-${idx}`}
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                {goal}
              </li>
            ))}
          </ul>
        </div>

        {/* Prior Knowledge Check */}
        <div data-testid="prior-knowledge-check">
          <h3 className="text-sm font-semibold mb-2">📋 Prior Knowledge Check</h3>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {lessonPlan.priorKnowledgeCheck}
          </p>
        </div>

        {/* Learning Steps */}
        <div data-testid="learning-steps">
          <h3 className="text-sm font-semibold mb-2">📖 Learning Path</h3>
          <Accordion type="single" collapsible className="w-full">
            {lessonPlan.steps.map((step, idx) => (
              <AccordionItem key={idx} value={`step-${idx}`} data-testid={`learning-step-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-lg">{stepTypeIcons[step.type] || "📝"}</span>
                    <span className="text-sm font-medium">
                      Step {idx + 1}: {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                    </span>
                    <Badge 
                      className={bloomLevelColors[step.bloomLevel] || "bg-gray-100"}
                      data-testid={`bloom-level-${idx}`}
                    >
                      {step.bloomLevel}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm" data-testid={`step-content-${idx}`}>
                      {step.content}
                    </p>
                    
                    {step.checkpoints.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          ✓ Checkpoints:
                        </p>
                        <ul className="space-y-1">
                          {step.checkpoints.map((checkpoint, cpIdx) => (
                            <li 
                              key={cpIdx} 
                              className="text-xs text-muted-foreground ml-4"
                              data-testid={`checkpoint-${idx}-${cpIdx}`}
                            >
                              • {checkpoint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~{step.estimatedMinutes} minutes
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Resources */}
        {lessonPlan.resources.length > 0 && (
          <div data-testid="lesson-resources">
            <h3 className="text-sm font-semibold mb-2">📚 Resources</h3>
            <ul className="space-y-1">
              {lessonPlan.resources.map((resource, idx) => (
                <li 
                  key={idx} 
                  className="text-sm text-muted-foreground"
                  data-testid={`resource-${idx}`}
                >
                  • {resource}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Target Bloom Level Badge */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Target Cognitive Level:</span>
            <Badge 
              className={bloomLevelColors[lessonPlan.targetBloomLevel] || "bg-gray-100"}
              data-testid="target-bloom-level"
            >
              {lessonPlan.targetBloomLevel.charAt(0).toUpperCase() + lessonPlan.targetBloomLevel.slice(1)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
