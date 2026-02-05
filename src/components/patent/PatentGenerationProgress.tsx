import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';

interface PatentGenerationProgressProps {
  status: string;
  sections: {
    key: string;
    label: string;
    content: string | null;
  }[];
}

export const PatentGenerationProgress = ({ 
  status, 
  sections 
}: PatentGenerationProgressProps) => {
  const completedSections = sections.filter(s => s.content).length;
  const totalSections = sections.length;
  const progressPercent = (completedSections / totalSections) * 100;

  const isGenerating = status === 'generating';
  const isReady = status === 'ready';

  if (isReady && completedSections === totalSections) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="font-medium">Generating your patent draft...</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Generation Progress</span>
              </>
            )}
          </div>
          <Badge variant={isReady ? "default" : "secondary"}>
            {completedSections} / {totalSections} sections
          </Badge>
        </div>
        
        <Progress value={progressPercent} className="h-2 mb-4" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {sections.map((section) => (
            <div 
              key={section.key}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                section.content 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {section.content ? (
                <CheckCircle className="h-3 w-3" />
              ) : isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="truncate">{section.label}</span>
            </div>
          ))}
        </div>

        {isGenerating && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            This typically takes 5-10 minutes. You'll be notified when it's ready.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
