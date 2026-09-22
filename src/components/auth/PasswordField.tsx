import { Flex, Input } from 'antd';
import { Link } from 'react-router-dom';

/**
 * Password input with a reveal toggle and the reset link.
 *
 * <p>antd's `Input.Password` owns the toggle, including whether the characters
 * are visible — which is nobody else's business, so it belongs there rather
 * than in the page. Its toggle is named "Show"/"Hide", which cannot collide
 * with a `getByLabelText(/password/i)` query for the field itself, and a
 * password input contributes no `textbox` role of its own.</p>
 */
export function PasswordField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (next: string) => void }>) {
  return (
    <div>
      <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
        <label htmlFor="password" style={{ fontWeight: 500 }}>
          Password
        </label>
        <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 500 }}>
          Forgot password?
        </Link>
      </Flex>
      <Input.Password
        id="password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="current-password"
      />
    </div>
  );
}
