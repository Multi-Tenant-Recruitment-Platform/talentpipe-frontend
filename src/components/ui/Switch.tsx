/**
 * On/off control. Pair with a `<label htmlFor={id}>` for its accessible name.
 * `type="button"` keeps it from ever submitting the surrounding form.
 */
export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  describedBy,
}: Readonly<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
}>) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span aria-hidden="true" className={`w-7 text-left text-xs font-medium ${checked ? 'text-indigo-700' : 'text-slate-500'}`}>
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}
