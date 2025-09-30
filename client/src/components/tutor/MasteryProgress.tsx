import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Brain, Award } from "lucide-react";

interface MasteryLevel {
  bloomLevel: string;
  score: number; // 0-100
  attempts: number;
  lastPracticed: string;
}

interface MasteryProgressProps {
  masteryLevels: MasteryLevel[];
  overallScore: number;
  weakAreas: string[];
  strongAreas: string[];
}

const bloomLevelInfo: Record<string, { label: string; icon: string; color: string }> = {
  remember: {
    label: "Remember",
    icon: "📝",
    color: "text-blue-600 dark:text-blue-400"
  },
  understand: {
    label: "Understand",
    icon: "💡",
    color: "text-green-600 dark:text-green-400"
  },
  apply: {
    label: "Apply",
    icon: "⚙️",
    color: "text-yellow-600 dark:text-yellow-400"
  },
  analyze: {
    label: "Analyze",
    icon: "🔍",
    color: "text-orange-600 dark:text-orange-400"
  },
  evaluate: {
    label: "Evaluate",
    icon: "⚖️",
    color: "text-purple-600 dark:text-purple-400"
  },
  create: {
    label: "Create",
    icon: "🎨",
    color: "text-pink-600 dark:text-pink-400"
  },
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

const getTrendIcon = (score: number) => {
  if (score >= 70) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (score >= 40) return <Minus className="h-4 w-4 text-yellow-500" />;
  return <TrendingDown className="h-4 w-4 text-red-500" />;
};

export function MasteryProgress({
  masteryLevels,
  overallScore,
  weakAreas,
  strongAreas
}: MasteryProgressProps) {
  return (
    <Card data-testid="mastery-progress-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Your Mastery Progress
          </CardTitle>
          <Badge 
            variant={overallScore >= 70 ? "default" : "secondary"}
            className="flex items-center gap-1"
            data-testid="overall-score"
          >
            <Award className="h-3 w-3" />
            {overallScore.toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress Bar */}
        <div data-testid="overall-progress">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Mastery</span>
            <span className={`text-sm font-semibold ${getScoreColor(overallScore)}`}>
              {overallScore.toFixed(1)}%
            </span>
          </div>
          <Progress value={overallScore} className="h-2" />
        </div>

        {/* Bloom Level Breakdown */}
        <div className="space-y-3" data-testid="bloom-levels">
          <h3 className="text-sm font-semibold">Cognitive Skills Breakdown</h3>
          {masteryLevels.map((level, idx) => {
            const levelInfo = bloomLevelInfo[level.bloomLevel] || {
              label: level.bloomLevel,
              icon: "📊",
              color: "text-gray-600"
            };

            return (
              <div key={level.bloomLevel} className="space-y-1" data-testid={`mastery-level-${idx}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{levelInfo.icon}</span>
                    <span className="text-sm font-medium">{levelInfo.label}</span>
                    {getTrendIcon(level.score)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getScoreColor(level.score)}`}>
                      {level.score.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({level.attempts} {level.attempts === 1 ? 'try' : 'tries'})
                    </span>
                  </div>
                </div>
                <Progress 
                  value={level.score} 
                  className="h-1.5"
                  data-testid={`progress-${level.bloomLevel}`}
                />
              </div>
            );
          })}
        </div>

        {/* Strong and Weak Areas */}
        <div className="grid grid-cols-2 gap-4">
          {strongAreas.length > 0 && (
            <div data-testid="strong-areas">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Strong Areas
              </h3>
              <ul className="space-y-1">
                {strongAreas.map((area, idx) => (
                  <li 
                    key={idx} 
                    className="text-xs text-green-600 dark:text-green-400"
                    data-testid={`strong-area-${idx}`}
                  >
                    ✓ {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weakAreas.length > 0 && (
            <div data-testid="weak-areas">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Focus Areas
              </h3>
              <ul className="space-y-1">
                {weakAreas.map((area, idx) => (
                  <li 
                    key={idx} 
                    className="text-xs text-orange-600 dark:text-orange-400"
                    data-testid={`weak-area-${idx}`}
                  >
                    ⚠ {area}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Encouragement Message */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {overallScore >= 80 
              ? "🎉 Excellent work! You're mastering this topic!"
              : overallScore >= 60 
              ? "💪 Good progress! Keep practicing to improve."
              : "📚 Keep learning! Every attempt builds your understanding."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
