import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { apiRequest } from '@/lib/api';

interface QuizPlayerProps {
  quizId: string;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export default function QuizPlayer({ quizId, onComplete, onExit }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());

  // Fetch quiz data
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['/api/quizzes', quizId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/quizzes/${quizId}`);
      return response.json();
    }
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  const handleAnswerSelect = (optionLabel: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionLabel
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

  const handleSkip = () => {
    // Remove answer if exists
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestionIndex];
    setAnswers(newAnswers);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const toggleFlag = () => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestionIndex)) {
      newFlagged.delete(currentQuestionIndex);
    } else {
      newFlagged.add(currentQuestionIndex);
    }
    setFlaggedQuestions(newFlagged);
  };

  const handleSubmit = async () => {
    const finalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      const response = await apiRequest('POST', `/quizzes/${quizId}/grade`, {
        answers: questions.map((_: any, index: number) => answers[index] || null),
        timeSpent: finalTimeSpent,
        userId: 'default-user'
      });
      
      const results = await response.json();
      onComplete(results);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-destructive mb-4"></i>
          <h3 className="text-lg font-semibold text-foreground mb-2">Quiz Not Found</h3>
          <p className="text-muted-foreground mb-4">The quiz could not be loaded.</p>
          <Button onClick={onExit}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <Card className="m-8 flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <CardTitle className="text-xl" data-testid="quiz-title">{quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {quiz.subject} • {quiz.difficulty} Level
              </p>
            </div>
            <Button variant="outline" onClick={onExit} data-testid="button-exit-quiz">
              <i className="fas fa-times mr-2"></i>Exit
            </Button>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Question <span data-testid="current-question">{currentQuestionIndex + 1}</span> of {questions.length}</span>
                <span><span data-testid="answered-count">{answeredCount}</span> answered</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <i className="fas fa-clock text-amber-600"></i>
              <span className="text-sm font-semibold text-amber-900" data-testid="quiz-timer">
                {formatTime(timeSpent)}
              </span>
            </div>
          </div>
        </CardHeader>

        {/* Question Content */}
        <CardContent className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Question */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">
                    {currentQuestionIndex + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <LaTeXRenderer
                    content={currentQuestion.stem}
                    className="text-base text-foreground leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options?.map((option: string, index: number) => {
                const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = answers[currentQuestionIndex] === optionLabel;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(optionLabel)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left group ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                    data-testid={`button-option-${optionLabel}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-primary'
                          : 'border-muted-foreground group-hover:border-primary'
                      }`}>
                        <div className={`w-3 h-3 rounded-full transition-all ${
                          isSelected ? 'bg-primary' : 'bg-transparent'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold mr-2">{optionLabel})</span>
                        <LaTeXRenderer content={option} className="inline" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Flag for Review */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFlag}
                className={`${
                  flaggedQuestions.has(currentQuestionIndex)
                    ? 'text-amber-600 hover:text-amber-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="button-flag-question"
              >
                <i className={`${
                  flaggedQuestions.has(currentQuestionIndex) ? 'fas' : 'far'
                } fa-flag mr-2`}></i>
                <span>Flag this question for review</span>
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            data-testid="button-previous-question"
          >
            <i className="fas fa-chevron-left mr-2"></i>Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              data-testid="button-skip-question"
            >
              Skip
            </Button>
            
            {isLastQuestion ? (
              <Button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-quiz"
              >
                Submit Quiz
                <i className="fas fa-check ml-2"></i>
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                data-testid="button-next-question"
              >
                Next Question<i className="fas fa-chevron-right ml-2"></i>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
