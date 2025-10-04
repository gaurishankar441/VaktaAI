import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/api';

interface TutorLauncherModalProps {
  onClose: () => void;
  onStart: (config: any, chatId: string) => void;
}

const subjects = [
  { id: 'mathematics', name: 'Mathematics', icon: 'fas fa-calculator', color: 'blue' },
  { id: 'physics', name: 'Physics', icon: 'fas fa-atom', color: 'purple' },
  { id: 'chemistry', name: 'Chemistry', icon: 'fas fa-flask', color: 'green' },
  { id: 'biology', name: 'Biology', icon: 'fas fa-dna', color: 'teal' },
];

const levels = [
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12', 'JEE Main', 'JEE Advanced', 'NEET UG'
];

const languages = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'Hindi' },
  { id: 'hinglish', name: 'Hinglish (Mixed)' }
];

export default function TutorLauncherModal({ onClose, onStart }: TutorLauncherModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const progress = (step / 4) * 100;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleStartSession();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      // Create chat session
      const response = await apiRequest('POST', '/chats', {
        mode: 'tutor',
        subject: selectedSubject,
        level: selectedLevel,
        topic: topic || 'General Discussion',
        language: selectedLanguage,
        userId: 'default-user',
        metadata: {
          board: selectedLevel.includes('JEE') ? 'JEE' : selectedLevel.includes('NEET') ? 'NEET' : 'CBSE'
        }
      });

      const chatSession = await response.json();
      
      const config = {
        subject: selectedSubject,
        level: selectedLevel,
        topic: topic || 'General Discussion',
        language: selectedLanguage,
        board: selectedLevel.includes('JEE') ? 'JEE' : selectedLevel.includes('NEET') ? 'NEET' : 'CBSE'
      };

      onStart(config, chatSession.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedSubject;
      case 2: return selectedLevel;
      case 3: return true; // Topic is optional
      case 4: return selectedLanguage;
      default: return false;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-tutor-launcher">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start AI Tutoring Session</DialogTitle>
          <p className="text-muted-foreground">Personalized learning in 4 simple steps</p>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Step {step} of 4</span>
            <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Content */}
        <div className="py-6 min-h-[300px]">
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Your Subject</h3>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left group ${
                      selectedSubject === subject.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                    data-testid={`button-subject-${subject.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-${subject.color}-100 flex items-center justify-center group-hover:bg-${subject.color}-200 transition-colors`}>
                        <i className={`${subject.icon} text-${subject.color}-600 text-xl`}></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{subject.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {subject.id === 'mathematics' && 'Algebra, Calculus, Geometry'}
                          {subject.id === 'physics' && 'Mechanics, Optics, Modern'}
                          {subject.id === 'chemistry' && 'Organic, Inorganic, Physical'}
                          {subject.id === 'biology' && 'Botany, Zoology, Genetics'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Your Level</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Class/Exam Level</label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger data-testid="select-level">
                      <SelectValue placeholder="Choose your level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedLevel && (
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium text-foreground mb-2">Level Details</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedLevel.includes('JEE') && 'Engineering entrance exam preparation with advanced problem-solving'}
                      {selectedLevel.includes('NEET') && 'Medical entrance exam preparation with conceptual clarity'}
                      {selectedLevel.includes('Class') && 'Board exam preparation with curriculum alignment'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Specify Topic (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">What would you like to learn?</label>
                  <Input
                    type="text"
                    placeholder="e.g., Rotational Motion, Organic Chemistry, Calculus..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    data-testid="input-topic"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Leave blank to start with general discussion and let the AI guide you
                  </p>
                </div>

                {topic && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-medium text-primary mb-1">Topic Focus</h4>
                    <p className="text-sm text-foreground">
                      The AI tutor will create a structured lesson plan around "{topic}" 
                      with explanations, examples, and practice questions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Language & Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Language</label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Summary */}
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium text-foreground mb-3">Session Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span className="text-foreground font-medium">
                        {subjects.find(s => s.id === selectedSubject)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level:</span>
                      <span className="text-foreground font-medium">{selectedLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Topic:</span>
                      <span className="text-foreground font-medium">{topic || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span className="text-foreground font-medium">
                        {languages.find(l => l.id === selectedLanguage)?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
            data-testid="button-previous"
          >
            <i className="fas fa-chevron-left mr-2"></i>
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            data-testid="button-next"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Starting...
              </>
            ) : step === 4 ? (
              <>
                Start Session
                <i className="fas fa-play ml-2"></i>
              </>
            ) : (
              <>
                Next
                <i className="fas fa-chevron-right ml-2"></i>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
