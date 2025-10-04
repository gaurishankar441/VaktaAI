import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, BookOpen, Clock, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface PlannerWizardProps {
  onClose: () => void;
  onComplete: (planId: string) => void;
}

const exams = [
  { id: 'jee-main', name: 'JEE Main', icon: 'fas fa-atom', description: 'Engineering entrance' },
  { id: 'neet-ug', name: 'NEET UG', icon: 'fas fa-stethoscope', description: 'Medical entrance' },
  { id: 'cbse-12', name: 'CBSE Class 12', icon: 'fas fa-school', description: 'Board exams' },
  { id: 'cuet', name: 'CUET', icon: 'fas fa-graduation-cap', description: 'University entrance' },
];

const subjects = [
  { id: 'physics', name: 'Physics', required: true },
  { id: 'chemistry', name: 'Chemistry', required: true },
  { id: 'mathematics', name: 'Mathematics', required: true },
  { id: 'biology', name: 'Biology', required: false },
];

const intensityLevels = [
  { id: 'light', name: 'Light', description: '2-3 hours/day', icon: 'fas fa-leaf' },
  { id: 'regular', name: 'Regular', description: '4-5 hours/day', icon: 'fas fa-clock' },
  { id: 'intense', name: 'Intense', description: '6+ hours/day', icon: 'fas fa-fire' },
];

const sessionDurations = [30, 45, 60];

const studyComponents = [
  { id: 'reminders', name: 'Smart Reminders', description: 'Get notified about study sessions' },
  { id: 'ai-tutor', name: 'AI Tutor Integration', description: 'Include tutoring sessions in plan' },
  { id: 'quizzes', name: 'Practice Quizzes', description: 'Regular assessment and practice' },
  { id: 'flashcards', name: 'SRS Flashcards', description: 'Spaced repetition for memorization' },
  { id: 'docchat', name: 'Document Study', description: 'Structured reading sessions' },
  { id: 'extra-resources', name: 'Extra Resources', description: 'Additional study materials' },
];

export default function PlannerWizard({ onClose, onComplete }: PlannerWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['physics', 'chemistry', 'mathematics']);
  const [topics, setTopics] = useState('');
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [hasExamDate, setHasExamDate] = useState(true);
  const [studyTime, setStudyTime] = useState('morning');
  const [intensity, setIntensity] = useState('regular');
  const [sessionDuration, setSessionDuration] = useState(45);
  const [includedComponents, setIncludedComponents] = useState<string[]>([
    'reminders', 'ai-tutor', 'quizzes', 'flashcards'
  ]);

  const progress = (step / 4) * 100;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject?.required) return; // Can't deselect required subjects

    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleComponentToggle = (componentId: string) => {
    setIncludedComponents(prev =>
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/study-plans', {
        exam: selectedExam,
        subjects: selectedSubjects,
        topics: topics ? topics.split(',').map(t => t.trim()) : [],
        grade: selectedClass,
        intensity,
        examDate: examDate?.toISOString(),
        sessionDuration,
        preferences: {
          studyTime,
          intensity,
          sessionDuration,
          components: includedComponents,
        },
        userId: 'default-user'
      });

      const plan = await response.json();
      onComplete(plan.id);
    } catch (error) {
      console.error('Failed to create study plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedExam && selectedClass && selectedSubjects.length > 0;
      case 2:
        return hasExamDate ? examDate : true;
      case 3:
        return studyTime && intensity && sessionDuration;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const getStepIcon = (stepNumber: number) => {
    if (stepNumber < step) return 'fas fa-check';
    if (stepNumber === step) return 'fas fa-circle';
    return 'far fa-circle';
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0" data-testid="modal-planner-wizard">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle className="text-2xl">Create Study Plan</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Let's build your personalized exam preparation schedule
          </p>
          
          {/* Step Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    stepNumber <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepNumber < step ? (
                      <i className="fas fa-check"></i>
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`h-1 w-16 mx-2 transition-all ${
                      stepNumber < step ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 1: Exam & Subject Details</h3>
              
              {/* Exam Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Select Your Exam/Board</Label>
                <div className="grid grid-cols-2 gap-3">
                  {exams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedExam(exam.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedExam === exam.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                      data-testid={`button-exam-${exam.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${exam.icon} text-primary text-xl`}></i>
                        <div>
                          <p className="font-semibold text-foreground">{exam.name}</p>
                          <p className="text-xs text-muted-foreground">{exam.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Class/Grade</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class-12">Class 12</SelectItem>
                    <SelectItem value="class-11">Class 11</SelectItem>
                    <SelectItem value="class-10">Class 10</SelectItem>
                    <SelectItem value="repeater">Repeater/Dropper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Select Subjects</Label>
                <div className="grid grid-cols-2 gap-3">
                  {subjects.map((subject) => (
                    <Card
                      key={subject.id}
                      className={`cursor-pointer transition-all ${
                        selectedSubjects.includes(subject.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary'
                      }`}
                      onClick={() => handleSubjectToggle(subject.id)}
                      data-testid={`card-subject-${subject.id}`}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Checkbox
                          checked={selectedSubjects.includes(subject.id)}
                          disabled={subject.required}
                          className="pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subject.required ? 'Core subject' : 'Optional'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Specific Topics (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g., Rotational Motion, Organic Chemistry, Calculus..."
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  data-testid="input-topics"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Leave blank to include all syllabus topics. Separate multiple topics with commas.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 2: Exam Timeline</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-exam-date"
                    checked={hasExamDate}
                    onCheckedChange={(checked) => setHasExamDate(checked as boolean)}
                    data-testid="checkbox-has-exam-date"
                  />
                  <Label htmlFor="has-exam-date">I have a specific exam date</Label>
                </div>

                {hasExamDate && (
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Exam Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                          data-testid="button-exam-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDate(examDate)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={examDate}
                          onSelect={setExamDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {!hasExamDate && (
                  <Card className="p-6 bg-muted/50">
                    <div className="text-center">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">Flexible Timeline</h4>
                      <p className="text-sm text-muted-foreground">
                        We'll create a comprehensive study plan that you can adapt based on your pace and goals.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 3: Study Preferences</h3>
              
              {/* Study Time Preference */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Preferred Study Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'morning', name: 'Morning', description: '6 AM - 12 PM', icon: 'fas fa-sun' },
                    { id: 'evening', name: 'Evening', description: '6 PM - 11 PM', icon: 'fas fa-moon' },
                  ].map((time) => (
                    <button
                      key={time.id}
                      onClick={() => setStudyTime(time.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        studyTime === time.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                      data-testid={`button-time-${time.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${time.icon} text-primary`}></i>
                        <div>
                          <p className="font-semibold text-foreground">{time.name}</p>
                          <p className="text-xs text-muted-foreground">{time.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity Level */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Study Intensity</Label>
                <div className="grid grid-cols-3 gap-3">
                  {intensityLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setIntensity(level.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        intensity === level.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                      data-testid={`button-intensity-${level.id}`}
                    >
                      <div className="text-center">
                        <i className={`${level.icon} text-primary text-xl mb-2`}></i>
                        <p className="font-semibold text-foreground">{level.name}</p>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Duration */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Session Duration</Label>
                <div className="grid grid-cols-3 gap-3">
                  {sessionDurations.map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setSessionDuration(duration)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        sessionDuration === duration
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                      data-testid={`button-duration-${duration}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{duration} min</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 4: Study Components</h3>
              
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  Include in Your Study Plan
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {studyComponents.map((component) => (
                    <Card
                      key={component.id}
                      className={`cursor-pointer transition-all ${
                        includedComponents.includes(component.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary'
                      }`}
                      onClick={() => handleComponentToggle(component.id)}
                      data-testid={`card-component-${component.id}`}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <Checkbox
                          checked={includedComponents.includes(component.id)}
                          className="pointer-events-none mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">{component.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{component.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Plan Summary */}
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Plan Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Exam:</span>
                      <p className="font-medium text-foreground">
                        {exams.find(e => e.id === selectedExam)?.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subjects:</span>
                      <p className="font-medium text-foreground">
                        {selectedSubjects.length} selected
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intensity:</span>
                      <p className="font-medium text-foreground capitalize">{intensity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sessions:</span>
                      <p className="font-medium text-foreground">{sessionDuration} min each</p>
                    </div>
                    {examDate && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Target Date:</span>
                        <p className="font-medium text-foreground">{formatDate(examDate)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
            data-testid="button-previous-step"
          >
            <i className="fas fa-chevron-left mr-2"></i>
            Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {step} of 4
            </span>
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            data-testid="button-next-step"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating...
              </>
            ) : step === 4 ? (
              <>
                Create Plan
                <i className="fas fa-check ml-2"></i>
              </>
            ) : (
              <>
                Next: {
                  step === 1 ? 'Exam Date' :
                  step === 2 ? 'Preferences' :
                  'Components'
                }
                <i className="fas fa-chevron-right ml-2"></i>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
