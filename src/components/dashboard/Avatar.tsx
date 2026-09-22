import { Avatar as AntAvatar } from 'antd';

/** Background/foreground pairs, kept as literals so a name's tint never drifts. */
const PALETTE = [
  { bg: '#e0e7ff', fg: '#4338ca' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#d1fae5', fg: '#047857' },
  { bg: '#fef3c7', fg: '#b45309' },
  { bg: '#ffe4e6', fg: '#be123c' },
  { bg: '#e0f2fe', fg: '#0369a1' },
];

const SIZES = { sm: 32, md: 40, lg: 48 } as const;
const FONT_SIZES = { sm: 12, md: 14, lg: 16 } as const;

/**
 * Initials avatar with a deterministic tint derived from the person's name,
 * so the same name always renders in the same colour across the dashboard.
 */
export function Avatar({
  firstName,
  lastName,
  size = 'md',
  style,
  className,
}: Readonly<{
  firstName: string;
  lastName?: string;
  size?: keyof typeof SIZES;
  style?: React.CSSProperties;
  /** Transitional: callers still passing Tailwind spacing. Removed with Tailwind. */
  className?: string;
}>) {
  const full = `${firstName} ${lastName ?? ''}`.trim();
  const initials = full
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  // codePointAt over charCodeAt: charCodeAt reads one UTF-16 code unit, which
  // splits a surrogate pair (e.g. an emoji in a name) into two mismatched
  // halves. The tint only needs a stable number, but it should be stable per
  // character, not per code unit.
  const hash = [...full].reduce((acc, ch) => acc + (ch.codePointAt(0) ?? 0), 0);
  const tone = PALETTE[hash % PALETTE.length];

  return (
    // aria-hidden because the name it abbreviates is always rendered beside it;
    // announcing "KS" before "Kasun Silva" is noise, not information.
    <AntAvatar
      size={SIZES[size]}
      className={className}
      aria-hidden="true"
      style={{
        backgroundColor: tone.bg,
        color: tone.fg,
        fontSize: FONT_SIZES[size],
        fontWeight: 600,
        flexShrink: 0,
        ...style,
      }}
    >
      {initials || '?'}
    </AntAvatar>
  );
}
