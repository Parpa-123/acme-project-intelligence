import { useFormContext } from 'react-hook-form';
import type { RegisterOptions } from 'react-hook-form';
import { Input } from '../ui/Input';
import type { InputProps } from '../ui/Input';

interface FormInputProps extends Omit<InputProps, 'name'> {
  name: string;
  label?: string;
  rules?: RegisterOptions;
}

export function FormInput({ name, label, rules, className, ...props }: FormInputProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <Input
        id={name}
        {...register(name, rules)}
        error={error}
        {...props}
      />
    </div>
  );
}
