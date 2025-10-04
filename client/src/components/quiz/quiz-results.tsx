import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { CheckCircle, XCircle, Circle, Star } from 'lucide-react';

interface QuizResultsProps {
  results: {
    score: number;
    correctCount: number;
    totalQuestions: number;
    results: Array<{
      questionIndex: number;
      question: string;
      userAnswer: string | null;
      correctAnswer: string;
      isCorrect: boolean;
      rationale: string;
    }>;
    attemptId: string;
  };
  onRetake: () => void;
  onClose: () => void;
}

export default function QuizResults({ results, onRetake, onClose }: QuizResultsProps) {
  const { score, correctCount, totalQuestions, results: questionResults } = results;
  const wrongCount = questionResults.filter(r => r.userAnswer && !r.isCorrect).length;
  const unattemptedCount = questionResults.filter(r => !r.userAnswer).length;

  const getResultIcon = (result: typeof questionResults[0]) => {
    if (!result.userAnswer) {
      return <Circle className="w-5 h-5 text-gray-600" />;
    }
    return result.isCorrect 
      ? <CheckCircle className="w-5 h-5 text-green-600" />
      : <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getResultBorderColor = (result: typeof questionResults[0]) => {
    if (!result.userAnswer) return 'border-gray-200';
    return result.isCorrect ? 'border-green-200' : 'border-red-200';
  };

  const getResultBgColor = (result: typeof questionResults[0]) => {
    if (!result.userAnswer) return 'bg-gray-50';
    return result.isCorrect ? 'bg-green-50' : 'bg-red-50';
  };

  const getResultStatusBadge = (result: typeof questionResults[0]) => {
    if (!result.userAnswer) {
      return <Badge variant="outline" className="text-gray-700 border-gray-200">SKIPPED</Badge>;
    }
    return result.isCorrect 
      ? <Badge className="bg-green-600 hover:bg-green-700">CORRECT</Badge>
      : <Badge variant="destructive">WRONG</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">Quiz Results</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review your performance and detailed explanations
              </p>
            </div>
            <Button variant="outline" onClick={onClose} data-testid="button-close-results">
              <i className="fas fa-times"></i>
            </Button>
          </div>

          {/* Score Overview */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold text-green-900">CORRECT</span>
                </div>
                <p className="text-2xl font-bold text-green-900" data-testid="correct-count">
                  {correctCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-semibold text-red-900">WRONG</span>
                </div>
                <p className="text-2xl font-bold text-red-900" data-testid="wrong-count">
                  {wrongCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-900">UNATTEMPTED</span>
                </div>
                <p className="text-2xl font-bold text-gray-900" data-testid="unattempted-count">
                  {unattemptedCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold text-primary">SCORE</span>
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="final-score">
                  {score}%
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogHeader>

        {/* Detailed Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {questionResults.map((result, index) => (
            <Card
              key={result.questionIndex}
              className={`border-2 ${getResultBorderColor(result)} ${getResultBgColor(result)}`}
              data-testid={`result-question-${result.questionIndex}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {getResultIcon(result)}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Question {result.questionIndex + 1}
                      </h3>
                      {getResultStatusBadge(result)}
                    </div>

                    <div className="mb-4">
                      <LaTeXRenderer
                        content={result.question}
                        className="text-sm text-foreground leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2 mb-4">
                      {result.userAnswer && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-semibold text-foreground min-w-[100px]">
                            Your Answer:
                          </span>
                          <span className={`text-sm ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {result.userAnswer}
                          </span>
                        </div>
                      )}
                      
                      {!result.isCorrect && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-semibold text-green-700 min-w-[100px]">
                            Correct Answer:
                          </span>
                          <span className="text-sm text-green-700 font-medium">
                            {result.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rationale */}
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <i className="fas fa-lightbulb text-sm mt-1 text-amber-600"></i>
                          <span className="text-xs font-semibold text-foreground">
                            Explanation
                          </span>
                        </div>
                        <LaTeXRenderer
                          content={result.rationale}
                          className="text-sm text-foreground leading-relaxed"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onRetake}
              data-testid="button-retake-quiz"
            >
              <i className="fas fa-redo mr-2"></i>
              Retake Quiz
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Implement review mode
                console.log('Review answers mode');
              }}
              data-testid="button-review-answers"
            >
              <i className="fas fa-eye mr-2"></i>
              Review Mode
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Implement save to notes
                console.log('Save results to notes');
              }}
              data-testid="button-save-notes"
            >
              <i className="fas fa-bookmark mr-2"></i>
              Save to Notes
            </Button>

            <Button
              onClick={onClose}
              data-testid="button-continue"
            >
              Continue Learning
              <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
