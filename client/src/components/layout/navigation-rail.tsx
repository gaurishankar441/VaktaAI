import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    path: '/tutor',
    icon: 'fas fa-robot',
    label: 'AI Tutor',
    description: 'Interactive learning',
  },
  {
    path: '/docchat',
    icon: 'fas fa-file-pdf',
    label: 'DocChat',
    description: 'Chat with documents',
  },
  {
    path: '/quiz',
    icon: 'fas fa-clipboard-question',
    label: 'Quizzes',
    description: 'Practice & assess',
  },
  {
    path: '/planner',
    icon: 'fas fa-calendar-days',
    label: 'Study Planner',
    description: 'Organize your study',
  },
  {
    path: '/notes',
    icon: 'fas fa-note-sticky',
    label: 'Notes',
    description: 'Cornell-style notes',
  },
  {
    path: '/flashcards',
    icon: 'fas fa-layer-group',
    label: 'Flashcards',
    description: 'Spaced repetition',
  },
];

const examPrepItems = [
  {
    path: '/jee',
    icon: 'fas fa-atom',
    label: 'JEE Prep',
    description: 'Engineering entrance',
  },
  {
    path: '/neet',
    icon: 'fas fa-stethoscope',
    label: 'NEET Prep',
    description: 'Medical entrance',
  },
  {
    path: '/cbse',
    icon: 'fas fa-school',
    label: 'CBSE/ICSE',
    description: 'Board exams',
  },
];

export default function NavigationRail() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col shadow-sm">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <i className="fas fa-graduation-cap text-primary-foreground text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">VaktaAI</h1>
            <p className="text-xs text-muted-foreground">Learn Smarter</p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 custom-scrollbar overflow-y-auto">
        {navigationItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-auto py-3 px-4 hover-lift",
                location === item.path || location === item.path.slice(1)
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <div className="flex-1 text-left">
                <span className="font-medium block">{item.label}</span>
              </div>
            </Button>
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground px-4 mb-2">EXAM PREP</p>
          
          {examPrepItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3 px-4",
                  location === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <i className={`${item.icon} w-5`}></i>
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3 px-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
            AR
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Aarav Sharma</p>
            <p className="text-xs text-muted-foreground">Class 12 • JEE</p>
          </div>
          <i className="fas fa-chevron-down text-muted-foreground text-sm"></i>
        </Button>
      </div>
    </aside>
  );
}
