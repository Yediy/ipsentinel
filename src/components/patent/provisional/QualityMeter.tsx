import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Target, FileCheck, Beaker, Layers } from 'lucide-react';
import { QualityScore, MIN_QUALITY_SCORE } from './types';

interface QualityMeterProps {
  score: QualityScore | null;
  followupPrompts: string[];
}

export const QualityMeter: React.FC<QualityMeterProps> = ({ score, followupPrompts }) => {
  if (!score) return null;

  const isPassing = score.overall >= MIN_QUALITY_SCORE;
  const overallPercent = Math.round(score.overall * 100);

  const metrics = [
    { label: 'Completeness', value: score.completeness, icon: FileCheck },
    { label: 'Specificity', value: score.specificity, icon: Target },
    { label: 'Embodiments', value: score.embodiments, icon: Layers },
    { label: 'Clarity', value: score.clarity, icon: Beaker },
  ];

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Quality Score</h3>
        <Badge variant={isPassing ? 'default' : 'secondary'} className="gap-1">
          {isPassing ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {overallPercent}%
        </Badge>
      </div>

      <div className="space-y-1">
        <Progress 
          value={overallPercent} 
          className={`h-2 ${isPassing ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="text-primary">Target: {MIN_QUALITY_SCORE * 100}%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{label}:</span>
            <span className={value >= 0.7 ? 'text-green-600' : value >= 0.4 ? 'text-amber-600' : 'text-red-600'}>
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
      </div>

      {followupPrompts.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">To improve your score:</p>
          {followupPrompts.map((prompt, i) => (
            <div key={i} className="flex gap-2 text-xs text-muted-foreground">
              <span className="text-primary">•</span>
              <span>{prompt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
