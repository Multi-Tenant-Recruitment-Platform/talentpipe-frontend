import { useState, type ChangeEvent } from 'react';

/** One state object for a form's text inputs; `field(name)` spreads value + onChange onto an input. */
export function useFormFields<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const field = (name: keyof T) => ({
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });
  return { values, field };
}
