import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  rationale: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloomLevel: string;
  citations: Array<{
    source: string;
    page?: number;
    time?: number;
  }>;
  orderIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  createdAt: string;
}

interface QuizInterfaceProps {
  quizId: string;
  onComplete?: (result: any) => void;
  onExit?: () => void;
}

export function QuizInterface({ quizId, onComplete, onExit }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [startTime] = useState(Date.now());
  const { toast } = useToast();

  // Fetch quiz data
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['/api/quizzes', quizId],
  });

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/quizzes/${quizId}/attempt`, {
        answers,
        timeSpent,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setQuizResults(result);
      setShowResults(true);
      onComplete?.(result);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quiz Not Found</h2>
            <p className="text-muted-foreground mb-4">The quiz you're looking for doesn't exist.</p>
            <Button onClick={onExit}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quiz, questions } = quizData;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Incomplete Quiz",
        description: `You have ${unansweredQuestions.length} unanswered questions. Please answer all questions before submitting.`,
        variant: "destructive",
      });
      return;
    }

    submitQuizMutation.mutate();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (showResults && quizResults) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {quizResults.percentage}%
              </div>
              <p className="text-muted-foreground">
                {quizResults.score} out of {quizResults.totalQuestions} correct
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold">{quizResults.score}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{quizResults.totalQuestions - quizResults.score}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{formatTime(timeSpent)}</div>
                <div className="text-sm text-muted-foreground">Time</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Question Review</h3>
              {questions.map((question, index) => {
                const answer = quizResults.answers[question.id];
                const isCorrect = answer?.isCorrect;
                
                return (
                  <Card key={question.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <Badge variant={isCorrect ? "default" : "destructive"}>
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{question.question}</p>
                      {!isCorrect && (
                        <div className="text-sm">
                          <p><strong>Your answer:</strong> {answer?.selected}</p>
                          <p><strong>Correct answer:</strong> {answer?.correct}</p>
                          <p className="mt-2 text-muted-foreground">{answer?.rationale}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={onExit} variant="outline" className="flex-1">
                Back to Quizzes
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1"
                data-testid="button-retake-quiz"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">{quiz.title}</h1>
            <p className="text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Time</div>
            <div className="text-lg font-mono font-semibold text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(timeSpent)}
            </div>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="flex-1 p-6">
        <Card className="h-full">
          <CardContent className="p-8 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                {currentQuestion.difficulty}
              </Badge>
              <Badge variant="outline">
                {currentQuestion.bloomLevel}
              </Badge>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-medium mb-6">{currentQuestion.question}</h2>
              
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={handleAnswerChange}
                className="space-y-4"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`}
                      data-testid={`option-${index}`}
                    />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Citations */}
            {currentQuestion.citations && currentQuestion.citations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.citations.map((citation, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {citation.source}
                      {citation.page && `, page ${citation.page}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-border">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            data-testid="button-previous-question"
          >
            Previous
          </Button>
          
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitQuizMutation.isPending}
              data-testid="button-submit-quiz"
            >
              {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              data-testid="button-next-question"
            >
              Next Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
