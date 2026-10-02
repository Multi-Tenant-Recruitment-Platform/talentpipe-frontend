import { Avatar as AntAvatar } from 'antd';
import { fontWeight, slate } from '../../theme/tokens';

const SIZES = { sm: 32, md: 40, lg: 48 } as const;
const FONT_SIZES = { sm: 12, md: 14, lg: 16 } as const;

/**
 * Initials avatar.
 *
 * <p>Deliberately one neutral treatment rather than a tint derived from the
 * name. A per-person colour looks like it encodes something — seniority,
 * status, team — and a roster of six rotating hues is the loudest thing on a
 * page whose actual signal is the status column. The name is always rendered
 * beside the initials, so identity never depended on the colour.</p>
 */
export function Avatar({
  firstName,
  lastName,
  size = 'md',
  style,
}: Readonly<{
  firstName: string;
  lastName?: string;
  size?: keyof typeof SIZES;
  style?: React.CSSProperties;
}>) {
  const full = `${firstName} ${lastName ?? ''}`.trim();
  const initials = full
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    // aria-hidden because the name it abbreviates is always rendered beside it;
    // announcing "KS" before "Kasun Silva" is noise, not information.
    <AntAvatar
      size={SIZES[size]}
      aria-hidden="true"
      style={{
        backgroundColor: slate[100],
        color: slate[600],
        fontSize: FONT_SIZES[size],
        fontWeight: fontWeight.semibold,
        flexShrink: 0,
        ...style,
      }}
    >
      {initials || '?'}
    </AntAvatar>
  );
}
