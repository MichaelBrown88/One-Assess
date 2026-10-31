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
  // Add native HTML5 validation attributes based on field type
  const inputMode = type === 'email' ? 'email' : type === 'tel' ? 'tel' : undefined;
  const pattern = type === 'email' ? '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$' : undefined;
  
  return (
    <SmartInput
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      value={(value as string) ?? ''}
      onValueChange={onValueChange}
      className="h-12 rounded-lg border-border focus:ring-primary"
      inputMode={inputMode}
      pattern={pattern}
    />
  );
};
