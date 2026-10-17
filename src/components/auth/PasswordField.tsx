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
  id = 'password',
  value,
  onChange,
}: Readonly<{ id?: string; value: string; onChange: (next: string) => void }>) {
  return (
    <div>
      <Flex align="center" justify="space-between" className="mb-1.5">
        <label htmlFor={id} className="text-small font-semibold text-slate-800">
          Password
        </label>
        <Link to="/forgot-password" className="text-caption font-semibold">
          Forgot password?
        </Link>
      </Flex>
      <Input.Password
        id={id}
        size="large"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="current-password"
      />
    </div>
  );
}
