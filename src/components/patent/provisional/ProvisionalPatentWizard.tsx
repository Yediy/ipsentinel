import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Loader, 
  Clock,
  FileText,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useProvisionalWizard } from './hooks/useProvisionalWizard';
import { QuestionRenderer } from './QuestionRenderer';
import { QualityMeter } from './QualityMeter';
import { PaymentFlow } from './PaymentFlow';
import { WizardAnswers } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProvisionalPatentWizardProps {
  filingId?: string;
  onComplete?: () => void;
}

type WizardView = 'questions' | 'payment';

export const ProvisionalPatentWizard: React.FC<ProvisionalPatentWizardProps> = ({
  filingId,
  onComplete
}) => {
  const [view, setView] = useState<WizardView>('questions');
  
  const {
    step,
    totalSteps,
    progress,
    currentQuestion,
    answers,
    saving,
    qualityScore,
    intakeId,
    isComplete,
    isQualityPassing,
    updateAnswer,
    goNext,
    goBack,
    goToStep,
    deleteIntake,
    getFollowupPrompts,
    scoreIntake,
    scoringLoading
  } = useProvisionalWizard({ filingId, onComplete });

  const currentValue = answers[currentQuestion.id as keyof WizardAnswers];

  const handleProceedToPayment = async () => {
    if (isQualityPassing && intakeId) {
      setView('payment');
    }
  };

  // Show payment flow
  if (view === 'payment' && intakeId && qualityScore) {
    return (
      <PaymentFlow
        intakeId={intakeId}
        qualityScore={qualityScore.overall}
        onCancel={() => setView('questions')}
        onSuccess={onComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Provisional Patent Intake</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete all sections to generate your patent draft
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              72h retention
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your answers. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteIntake} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Question {step + 1} of {totalSteps}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const hasAnswer = !!answers[currentQuestion.id as keyof WizardAnswers];
            const isActive = i === step;
            const isPast = i < step;
            
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors shrink-0
                  ${isActive ? 'bg-primary text-primary-foreground' : ''}
                  ${isPast ? 'bg-primary/20 text-primary' : ''}
                  ${!isActive && !isPast ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{currentQuestion.label}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{currentQuestion.hint}</p>
                </div>
                {currentQuestion.required && (
                  <Badge variant="secondary" className="shrink-0">Required</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <QuestionRenderer
                question={currentQuestion}
                value={currentValue}
                onChange={(value) => updateAnswer(currentQuestion.id, value)}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              
              {isComplete ? (
                <Button
                  onClick={handleProceedToPayment}
                  disabled={!isQualityPassing || !intakeId}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Proceed to Payment
                </Button>
              ) : (
                <Button onClick={goNext} className="gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <QualityMeter 
            score={qualityScore} 
            followupPrompts={getFollowupPrompts()} 
          />

           {!isQualityPassing && intakeId && (
            <Card className="border-secondary/50 bg-secondary/5">
              <CardContent className="p-4">
                <Button
                  onClick={scoreIntake}
                  disabled={scoringLoading || !intakeId}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {scoringLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {scoringLoading ? 'Scoring...' : 'Score & Check Quality'}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Review your quality score and see specific suggestions to strengthen your application.
                </p>
              </CardContent>
            </Card>
          )}

          {isQualityPassing && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Ready for payment</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Your answers meet the quality threshold. Proceed to payment to generate your patent draft.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Data Retention</h4>
              <p className="text-xs text-muted-foreground">
                Your inputs and generated documents auto-delete after 72 hours. 
                You can delete immediately any time using the trash icon above.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
