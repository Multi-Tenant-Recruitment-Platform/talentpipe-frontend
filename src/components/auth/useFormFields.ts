import { useState, type ChangeEvent } from 'react';

/**
 * One state object for a form's text inputs; `field(name)` spreads value + onChange onto an input.
 *
 * <p>Also holds an error per field — the ones the server named when it
 * refused the form. A field's error goes the moment that field is changed, so
 * the message never outlives the mistake it describes.</p>
 */
export function useFormFields<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const field = (name: keyof T) => ({
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      setErrors((current) => {
        if (!current[name]) return current;
        const rest = { ...current };
        delete rest[name];
        return rest;
      });
    },
  });
  return { values, field, errors, setErrors };
}

/** What an input carries while its field has an error: the red outline, and the message read with it. */
export function fieldErrorProps(id: string, error: string | undefined) {
  return error ? ({ status: 'error', 'aria-invalid': true, 'aria-describedby': `${id}-error` } as const) : {};
}

/**
 * The server's field errors that belong to this form's fields, in the form's
 * order — so the first one is the first to fix.
 */
export function knownFieldErrors<T extends Record<string, string>>(
  values: T,
  serverErrors: Record<string, string>,
): Partial<Record<keyof T, string>> {
  const known: Partial<Record<keyof T, string>> = {};
  for (const name of Object.keys(values) as (keyof T)[]) {
    const message = serverErrors[name as string];
    if (message) known[name] = message;
  }
  return known;
}
