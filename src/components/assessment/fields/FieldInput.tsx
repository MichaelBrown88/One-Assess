import { numericIssue, numericWarning } from '@/lib/assessment/numericValidation';
import { SmartInput } from '@/components/ui/SmartInput';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldInputProps {
  id: string;
  type: string;
  placeholder?: string;
  // New props for SmartInput pattern
  value: FieldValue;
  onValueChange: (val: string) => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({
  id,
  type,
  placeholder,
  value,
  onValueChange,
}) => {
  const warning = type === 'number' ? numericWarning(id, value) : null;
  const issue = type === 'number' ? numericIssue(id, value) : null;
  return (
    <>
    <SmartInput
      id={id}
      name={id}
      aria-invalid={Boolean(issue)}
      aria-describedby={issue ? `${id}-error` : undefined}
      type={type}
      placeholder={placeholder}
      value={(value as string) ?? ''}
      onValueChange={onValueChange}
      className="h-12 rounded-lg border-border focus:ring-primary"
    />
    {warning && <p className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>}
    {issue && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{issue}</p>}
    </>
  );
};
