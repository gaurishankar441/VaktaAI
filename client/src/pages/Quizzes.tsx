import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  RotateCcw,
  Trophy,
  Target
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  createdAt: string;
}

interface QuizAttempt {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent?: number;
}

export default function Quizzes() {
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<string>("");
  const { toast } = useToast();

  // Fetch quizzes
  const { data: quizzes } = useQuery({
    queryKey: ['/api/quizzes'],
  });

  // Fetch documents for quiz generation
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Fetch quiz attempts for each quiz
  const { data: attempts } = useQuery({
    queryKey: ['/api/quizzes/attempts'],
    queryFn: async () => {
      // This would need to be implemented to get attempts for all quizzes
      return [];
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/quizzes/generate', {
        documentIds: selectedDocuments,
        numberOfQuestions,
        difficulty: difficulty || undefined,
        title: quizTitle || `Generated Quiz - ${new Date().toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: (newQuiz) => {
      setShowGenerator(false);
      setSelectedDocuments([]);
      setQuizTitle("");
      setNumberOfQuestions(5);
      setDifficulty("");
      queryClient.invalidateQueries({ queryKey: ['/api/quizzes'] });
      toast({
        title: "Quiz Generated",
        description: "Your quiz has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleGenerateQuiz = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to generate a quiz.",
        variant: "destructive",
      });
      return;
    }
    generateQuizMutation.mutate();
  };

  const getQuizStatus = (quiz: Quiz) => {
    // This would check if user has completed the quiz
    return Math.random() > 0.5 ? 'completed' : 'available';
  };

  const getQuizScore = (quiz: Quiz) => {
    // This would get the user's best score for this quiz
    return Math.floor(Math.random() * 100) + 1;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const availableDocuments = documents?.filter((doc: any) => doc.status === 'indexed') || [];

  // If quiz is selected, show quiz interface
  if (selectedQuizId) {
    return (
      <MainLayout>
        <QuizInterface 
          quizId={selectedQuizId}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/quizzes'] });
          }}
          onExit={() => setSelectedQuizId(null)}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
              <p className="text-muted-foreground">
                Test your knowledge with AI-generated quizzes
              </p>
            </div>
            <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
              <DialogTrigger asChild>
                <Button data-testid="button-generate-quiz">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate New Quiz</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-title">Quiz Title (Optional)</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Enter quiz title..."
                      data-testid="input-quiz-title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Select value={numberOfQuestions.toString()} onValueChange={(value) => setNumberOfQuestions(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Questions</SelectItem>
                          <SelectItem value="5">5 Questions</SelectItem>
                          <SelectItem value="10">10 Questions</SelectItem>
                          <SelectItem value="15">15 Questions</SelectItem>
                          <SelectItem value="20">20 Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty (Optional)</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Documents</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {availableDocuments.length > 0 ? (
                        availableDocuments.map((doc: any) => (
                          <div 
                            key={doc.id}
                            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedDocuments.includes(doc.id) 
                                ? 'bg-primary/10 border-primary' 
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => handleDocumentToggle(doc.id)}
                            data-testid={`document-${doc.id}`}
                          >
                            <div className="w-4 h-4 border-2 rounded flex items-center justify-center">
                              {selectedDocuments.includes(doc.id) && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No processed documents available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleGenerateQuiz}
                      disabled={selectedDocuments.length === 0 || generateQuizMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-generate"
                    >
                      {generateQuizMutation.isPending ? "Generating..." : "Generate Quiz"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowGenerator(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quiz List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes && quizzes.length > 0 ? (
              quizzes.map((quiz: Quiz) => {
                const status = getQuizStatus(quiz);
                const score = getQuizScore(quiz);
                
                return (
                  <Card 
                    key={quiz.id}
                    className="hover:shadow-md transition-shadow"
                    data-testid={`quiz-${quiz.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                            <HelpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{quiz.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {quiz.description || `Generated on ${new Date(quiz.createdAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                          {status === 'completed' ? 'Completed' : 'Available'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Questions:</span>
                          <span>{quiz.totalQuestions}</span>
                        </div>
                        {status === 'completed' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Best Score:</span>
                            <span className="text-green-600 font-medium">{score}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estimated time:</span>
                          <span>{quiz.totalQuestions * 2} minutes</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {status === 'completed' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                // Review quiz results
                                setSelectedQuizId(quiz.id);
                              }}
                              data-testid={`button-review-${quiz.id}`}
                            >
                              <Trophy className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setSelectedQuizId(quiz.id)}
                              data-testid={`button-retake-${quiz.id}`}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retake
                            </Button>
                          </>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => setSelectedQuizId(quiz.id)}
                            data-testid={`button-start-${quiz.id}`}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Start Quiz
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No quizzes yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first quiz from your documents
                  </p>
                  <Button onClick={() => setShowGenerator(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate First Quiz
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
