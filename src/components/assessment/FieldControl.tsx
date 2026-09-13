import React from 'react';
import ParQQuestionnaire from '@/components/ParQQuestionnaire';
import { useFieldControl } from './hooks/useFieldControl';
import { FieldLabel } from './fields/FieldLabel';
import { FieldTextArea } from './fields/FieldTextArea';
import { FieldSelect } from './fields/FieldSelect';
import { FieldMultiSelect } from './fields/FieldMultiSelect';
import { FieldInput } from './fields/FieldInput';
import { PosturePhotoModePanel } from './fields/PosturePhotoModePanel';
import type { PhaseField } from '@/lib/phaseConfig';

interface FieldControlProps {
  field: PhaseField;
  onShowCamera?: (mode: 'ocr') => void;
  onShowPostureCompanion?: () => void;
  onExitParQ?: () => void;
  onParQComplete?: () => void;
}

export function FieldControl({
  field,
  onShowCamera,
  onShowPostureCompanion,
  onExitParQ,
  onParQComplete,
}: FieldControlProps) {
  const {
    localValue,
    setLocalValue,
    fieldOptions,
    shouldShow,
    handleChange,
    debouncedHandleChange,
    orgSettings,
    formData,
  } = useFieldControl({ field });

  if (!shouldShow) {
    return null;
  }

  const renderInput = () => {
    const value = formData[field.id];

    // Special UI for AI Posture Scan choice
    if (field.id === 'postureInputMode' && value === 'ai') {
      return (
        <PosturePhotoModePanel
          hasResults={Boolean(formData.postureAiResults)}
          onCapture={() => onShowPostureCompanion?.()}
          onSwitchToManual={() => handleChange('manual')}
        />
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <FieldTextArea 
            id={field.id}
            placeholder={field.placeholder}
            localValue={localValue}
            setLocalValue={setLocalValue}
            handleChange={handleChange}
            debouncedHandleChange={debouncedHandleChange}
          />
        );
      case 'select':
        return (
          <FieldSelect 
            id={field.id}
            options={fieldOptions}
            value={value as string}
            handleChange={handleChange}
          />
        );
      case 'multiselect':
        return (
          <FieldMultiSelect
            id={field.id}
            options={fieldOptions}
            value={value as string[]}
            handleChange={handleChange}
            selectionLabels={field.id === 'clientGoals' ? (i) => (i === 0 ? 'Primary' : 'Secondary') : undefined}
          />
        );
      case 'parq':
        return <ParQQuestionnaire onExitParQ={onExitParQ} onComplete={onParQComplete} />;
      case 'time':
      case 'date':
      case 'email':
      case 'tel':
      case 'number':
      case 'text':
      default:
        return (
          <FieldInput 
            id={field.id}
            type={field.type === 'number' ? 'number' : field.type || 'text'}
            placeholder={field.placeholder}
            value={formData[field.id] as string}
            onValueChange={(val: string) => handleChange(val)}
          />
        );
    }
  };

  // PAR-Q and photo posture render their own titles
  if (field.type === 'parq' || (field.id === 'postureInputMode' && formData.postureInputMode === 'ai')) {
    return <>{renderInput()}</>;
  }

  return (
    <div className="space-y-1">
      <FieldLabel field={field} orgSettings={orgSettings} formData={formData} />
      {renderInput()}
    </div>
  );
}
