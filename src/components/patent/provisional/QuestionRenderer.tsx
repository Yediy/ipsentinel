import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Lightbulb } from 'lucide-react';
import { WizardQuestion, WizardAnswers, FIGURE_OPTIONS } from './types';

interface QuestionRendererProps {
  question: WizardQuestion;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange
}) => {
  const [newListItem, setNewListItem] = useState('');

  const renderExample = () => {
    if (!question.example) return null;
    
    const exampleText = Array.isArray(question.example) 
      ? question.example.join(', ')
      : question.example;

    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-medium text-muted-foreground">Example:</span>
            <p className="text-sm text-muted-foreground mt-1">{exampleText}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCharCount = (current: number, min?: number, max?: number) => {
    if (!max && !min) return null;
    
    const isUnder = min && current < min;
    const isOver = max && current > max;
    
    return (
      <div className={`text-xs mt-1 ${isUnder ? 'text-destructive' : isOver ? 'text-destructive' : 'text-muted-foreground'}`}>
        {current} / {max || 'no limit'} characters
        {min && current < min && ` (minimum ${min})`}
      </div>
    );
  };

  if (question.type === 'text') {
    const strValue = (value as string) || '';
    return (
      <div className="space-y-2">
        <Input
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.hint}
          maxLength={question.validation.max_chars}
          className="text-base"
        />
        {renderCharCount(strValue.length, question.validation.min_chars, question.validation.max_chars)}
        {renderExample()}
      </div>
    );
  }

  if (question.type === 'textarea') {
    const strValue = (value as string) || '';
    return (
      <div className="space-y-2">
        <Textarea
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.hint}
          maxLength={question.validation.max_chars}
          className="min-h-[150px] text-base leading-relaxed resize-y"
        />
        {renderCharCount(strValue.length, question.validation.min_chars, question.validation.max_chars)}
        {renderExample()}
      </div>
    );
  }

  if (question.type === 'list') {
    const listValue = (value as string[]) || [];
    
    const addItem = () => {
      if (!newListItem.trim()) return;
      if (question.validation.max_items && listValue.length >= question.validation.max_items) {
        return;
      }
      onChange([...listValue, newListItem.trim()]);
      setNewListItem('');
    };

    const removeItem = (index: number) => {
      onChange(listValue.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newListItem}
            onChange={(e) => setNewListItem(e.target.value)}
            placeholder="Add an item..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            className="flex-1"
          />
          <Button 
            type="button" 
            onClick={addItem}
            disabled={!newListItem.trim() || (question.validation.max_items && listValue.length >= question.validation.max_items)}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {listValue.length > 0 && (
          <div className="space-y-2">
            {listValue.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border"
              >
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <span className="flex-1 text-sm">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeItem(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          {listValue.length} / {question.validation.max_items || '∞'} items
          {question.validation.min_items && listValue.length < question.validation.min_items && 
            ` (need at least ${question.validation.min_items})`}
        </div>
        
        {renderExample()}
      </div>
    );
  }

  if (question.type === 'multi_select') {
    const selectedValue = (value as string[]) || [];
    const options = question.options || FIGURE_OPTIONS;

    const toggleOption = (option: string) => {
      if (selectedValue.includes(option)) {
        onChange(selectedValue.filter(v => v !== option));
      } else {
        if (question.validation.max_selected && selectedValue.length >= question.validation.max_selected) {
          return;
        }
        onChange([...selectedValue, option]);
      }
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {options.map((option) => {
            const isSelected = selectedValue.includes(option);
            const isDisabled = !isSelected && 
              question.validation.max_selected !== undefined && 
              selectedValue.length >= question.validation.max_selected;

            return (
              <label
                key={option}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${isSelected ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => !isDisabled && toggleOption(option)}
                  disabled={isDisabled}
                />
                <span className="text-sm">{option}</span>
              </label>
            );
          })}
        </div>
        
        <div className="text-xs text-muted-foreground">
          {selectedValue.length} / {question.validation.max_selected || '∞'} selected
          {question.validation.min_selected && selectedValue.length < question.validation.min_selected && 
            ` (select at least ${question.validation.min_selected})`}
        </div>
      </div>
    );
  }

  return null;
};
