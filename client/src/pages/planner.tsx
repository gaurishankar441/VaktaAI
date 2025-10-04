import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PlannerWizard from '@/components/planner/planner-wizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PlannerPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch user's study plans
  const { data: plans, refetch } = useQuery({
    queryKey: ['/api/study-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/study-plans');
      return response.json();
    }
  });

  const handlePlanCreated = (planId: string) => {
    setShowWizard(false);
    setSelectedPlan(planId);
    refetch();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTaskIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'read':
      case 'docchat':
        return 'fas fa-book-open';
      case 'tutor':
        return 'fas fa-robot';
      case 'quiz':
        return 'fas fa-clipboard-question';
      case 'flashcards':
        return 'fas fa-layer-group';
      default:
        return 'fas fa-circle';
    }
  };

  const getTaskColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'read':
      case 'docchat':
        return 'text-blue-600 bg-blue-100';
      case 'tutor':
        return 'text-purple-600 bg-purple-100';
      case 'quiz':
        return 'text-orange-600 bg-orange-100';
      case 'flashcards':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (showWizard) {
    return (
      <PlannerWizard
        onClose={() => setShowWizard(false)}
        onComplete={handlePlanCreated}
      />
    );
  }

  const activePlan = plans?.find((plan: any) => plan.id === selectedPlan || plan.status === 'active');

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      
      {/* Left Sidebar - Plans List */}
      <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Study Plans</h2>
          <Button
            onClick={() => setShowWizard(true)}
            size="sm"
            data-testid="button-create-plan"
          >
            <i className="fas fa-plus mr-2"></i>
            New
          </Button>
        </div>

        {plans && plans.length > 0 ? (
          <div className="space-y-3">
            {plans.map((plan: any) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedPlan === plan.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">{plan.exam} Preparation</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={plan.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {plan.status}
                        </Badge>
                        {Array.isArray(plan.subjects) && (
                          <Badge variant="outline" className="text-xs">
                            {plan.subjects.length} subjects
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No study plans yet</p>
            <Button onClick={() => setShowWizard(true)} variant="outline">
              Create Your First Plan
            </Button>
          </div>
        )}
      </div>

      {/* Main Content - Plan Details */}
      <div className="flex-1 overflow-hidden">
        {activePlan ? (
          <div className="h-full flex flex-col">
            {/* Plan Header */}
            <div className="p-6 border-b border-border bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{activePlan.title}</h1>
                  <p className="text-muted-foreground mt-1">{activePlan.exam} • {Array.isArray(activePlan.subjects) ? activePlan.subjects.join(', ') : ''}</p>
                  
                  {/* Plan Stats */}
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {Array.isArray(activePlan.schedule) ? activePlan.schedule.length : 0} tasks
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {activePlan.preferences?.sessionDuration || 45} min sessions
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="default">{activePlan.status}</Badge>
                  <Button variant="outline" size="sm">
                    <i className="fas fa-edit mr-2"></i>
                    Edit Plan
                  </Button>
                </div>
              </div>
            </div>

            {/* Schedule Timeline */}
            <div className="flex-1 p-6 overflow-y-auto">
              {Array.isArray(activePlan.schedule) && activePlan.schedule.length > 0 ? (
                <div className="space-y-6">
                  {activePlan.schedule.map((task: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full ${getTaskColor(task.type)} flex items-center justify-center`}>
                          <i className={`${getTaskIcon(task.type)} text-sm`}></i>
                        </div>
                        {index < activePlan.schedule.length - 1 && (
                          <div className="w-px h-16 bg-border mt-2"></div>
                        )}
                      </div>
                      
                      {/* Task details */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{task.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            {task.refs && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <i className="fas fa-book mr-1"></i>
                                {task.refs}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {formatDate(task.date)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.duration} min
                            </p>
                          </div>
                        </div>
                        
                        {/* Task actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            Start Task
                          </Button>
                          <Button size="sm" variant="ghost">
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks scheduled</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Welcome State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg px-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Study Planner
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Create personalized study schedules tailored to your exam goals and learning preferences.
              </p>
              <Button 
                onClick={() => setShowWizard(true)}
                className="px-8 py-3 text-lg"
                data-testid="button-create-first-plan"
              >
                <i className="fas fa-calendar-plus mr-3"></i>
                Create Study Plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
