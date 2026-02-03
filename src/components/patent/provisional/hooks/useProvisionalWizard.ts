import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  WizardAnswers, 
  IntakeRecord, 
  QualityScore, 
  WIZARD_QUESTIONS, 
  QUALITY_WEIGHTS,
  MIN_QUALITY_SCORE 
} from '../types';

interface UseProvisionalWizardProps {
  filingId?: string;
  onComplete?: () => void;
}

export function useProvisionalWizard({ filingId, onComplete }: UseProvisionalWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  const totalSteps = WIZARD_QUESTIONS.length;
  const currentQuestion = WIZARD_QUESTIONS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  // Load existing intake if available
  useEffect(() => {
    if (filingId) {
      loadExistingIntake(filingId);
    }
  }, [filingId]);

  const loadExistingIntake = async (fId: string) => {
    try {
      const { data, error } = await supabase
        .from('intakes')
        .select('*')
        .eq('filing_id', fId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setIntakeId(data.id);
        setAnswers((data.answers_json as WizardAnswers) || {});
      }
    } catch (error) {
      // No existing intake, that's fine
    }
  };

  const calculateQualityScore = useCallback((currentAnswers: WizardAnswers): QualityScore => {
    // Completeness: % of required fields filled
    const requiredQuestions = WIZARD_QUESTIONS.filter(q => q.required);
    let filledCount = 0;
    requiredQuestions.forEach(q => {
      const answer = currentAnswers[q.id as keyof WizardAnswers];
      if (answer) {
        if (Array.isArray(answer)) {
          if (answer.length >= (q.validation.min_items || 1)) filledCount++;
        } else if (typeof answer === 'string' && answer.length >= (q.validation.min_chars || 1)) {
          filledCount++;
        }
      }
    });
    const completeness = filledCount / requiredQuestions.length;

    // Specificity: check for numbers/measurements in answers
    const textAnswers = Object.entries(currentAnswers)
      .filter(([_, v]) => typeof v === 'string')
      .map(([_, v]) => v as string)
      .join(' ');
    const hasNumbers = /\d+/.test(textAnswers);
    const hasUnits = /(inch|in\.|cm|mm|lb|kg|°|percent|%|ms|sec|min)/.test(textAnswers.toLowerCase());
    const specificity = (hasNumbers ? 0.5 : 0) + (hasUnits ? 0.5 : 0);

    // Embodiments: check variations field
    const variations = currentAnswers.variations || '';
    const variationCount = (variations.match(/variation|alternative|option|version/gi) || []).length;
    const embodiments = Math.min(variationCount / 2, 1);

    // Clarity: average length of answers vs expected
    let clarityScore = 0;
    let clarityCount = 0;
    WIZARD_QUESTIONS.forEach(q => {
      const answer = currentAnswers[q.id as keyof WizardAnswers];
      if (q.type === 'textarea' && typeof answer === 'string' && q.validation.min_chars) {
        const idealLength = (q.validation.min_chars + (q.validation.max_chars || q.validation.min_chars * 3)) / 2;
        const ratio = Math.min(answer.length / idealLength, 1);
        clarityScore += ratio;
        clarityCount++;
      }
    });
    const clarity = clarityCount > 0 ? clarityScore / clarityCount : 0;

    const overall = 
      completeness * QUALITY_WEIGHTS.completeness +
      specificity * QUALITY_WEIGHTS.specificity +
      embodiments * QUALITY_WEIGHTS.embodiments +
      clarity * QUALITY_WEIGHTS.clarity;

    return { overall, completeness, specificity, embodiments, clarity };
  }, []);

  const saveProgress = useCallback(async (currentAnswers: WizardAnswers) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const score = calculateQualityScore(currentAnswers);
      setQualityScore(score);

      // Cast to Json type for Supabase compatibility
      const answersJson = JSON.parse(JSON.stringify(currentAnswers));
      const deleteAfter = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const statusValue = score.overall >= MIN_QUALITY_SCORE ? 'ready_for_payment' : 'draft';

      if (intakeId) {
        const { error } = await supabase
          .from('intakes')
          .update({
            answers_json: answersJson,
            quality_score: score.overall,
            status: statusValue,
            delete_after: deleteAfter
          })
          .eq('id', intakeId);
        if (error) throw error;
      } else {
        const insertData = {
          user_id: user.id,
          filing_id: filingId || undefined,
          wizard_version: 'v1.0',
          answers_json: answersJson,
          quality_score: score.overall,
          status: statusValue,
          delete_after: deleteAfter
        };
        const { data, error } = await supabase
          .from('intakes')
          .insert(insertData)
          .select('id')
          .single();
        if (error) throw error;
        setIntakeId(data.id);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  }, [intakeId, filingId, calculateQualityScore]);

  const updateAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      return updated;
    });
  }, []);

  const validateCurrentStep = useCallback((): { valid: boolean; error?: string } => {
    const question = WIZARD_QUESTIONS[step];
    const answer = answers[question.id as keyof WizardAnswers];

    if (!question.required && !answer) {
      return { valid: true };
    }

    if (question.required && !answer) {
      return { valid: false, error: 'This field is required' };
    }

    if (question.type === 'list' || question.type === 'multi_select') {
      const arr = answer as string[] || [];
      if (question.validation.min_items && arr.length < question.validation.min_items) {
        return { valid: false, error: `Please add at least ${question.validation.min_items} items` };
      }
      if (question.validation.max_items && arr.length > question.validation.max_items) {
        return { valid: false, error: `Maximum ${question.validation.max_items} items allowed` };
      }
      if (question.validation.min_item_chars) {
        const tooShort = arr.some(item => item.length < question.validation.min_item_chars!);
        if (tooShort) {
          return { valid: false, error: `Each item must be at least ${question.validation.min_item_chars} characters` };
        }
      }
    } else {
      const str = answer as string || '';
      if (question.validation.min_chars && str.length < question.validation.min_chars) {
        return { valid: false, error: `Minimum ${question.validation.min_chars} characters required` };
      }
      if (question.validation.max_chars && str.length > question.validation.max_chars) {
        return { valid: false, error: `Maximum ${question.validation.max_chars} characters allowed` };
      }
    }

    return { valid: true };
  }, [step, answers]);

  const goNext = useCallback(async () => {
    const validation = validateCurrentStep();
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    await saveProgress(answers);

    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      onComplete?.();
    }
  }, [step, totalSteps, answers, validateCurrentStep, saveProgress, onComplete]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  }, [step]);

  const goToStep = useCallback((targetStep: number) => {
    if (targetStep >= 0 && targetStep < totalSteps) {
      setStep(targetStep);
    }
  }, [totalSteps]);

  const deleteIntake = useCallback(async () => {
    if (!intakeId) return;
    
    try {
      const { error } = await supabase
        .from('intakes')
        .delete()
        .eq('id', intakeId);
      
      if (error) throw error;
      
      setAnswers({});
      setIntakeId(null);
      setStep(0);
      toast.success('Data deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete data');
    }
  }, [intakeId]);

  const getFollowupPrompts = useCallback((): string[] => {
    if (!qualityScore) return [];
    
    const prompts: string[] = [];
    
    if (qualityScore.specificity < 0.5) {
      prompts.push("Add any numbers or ranges (size, speed, weight, temperature, load, latency). Even estimates help.");
    }
    if (qualityScore.embodiments < 0.5) {
      prompts.push("Describe at least two variations: different mechanism/material/software approach, or different form factor.");
    }
    if (qualityScore.completeness < 0.8) {
      prompts.push("Please complete all required fields for a stronger patent application.");
    }
    
    return prompts;
  }, [qualityScore]);

  return {
    step,
    totalSteps,
    progress,
    currentQuestion,
    answers,
    intakeId,
    loading,
    saving,
    qualityScore,
    isComplete: step === totalSteps - 1,
    isQualityPassing: qualityScore ? qualityScore.overall >= MIN_QUALITY_SCORE : false,
    updateAnswer,
    validateCurrentStep,
    goNext,
    goBack,
    goToStep,
    saveProgress,
    deleteIntake,
    getFollowupPrompts
  };
}
