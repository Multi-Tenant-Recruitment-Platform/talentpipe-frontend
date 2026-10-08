import { Alert } from '../ui/Alert';

/**
 * The failed-login banner. `onResend` is given only when the backend said the
 * account exists but is unverified (403) — the one case where offering a new
 * verification link is useful, and safe, because the caller has already proven
 * they know the password.
 */
export function LoginErrorAlert({
  message,
  onResend,
}: Readonly<{ message: string; onResend?: () => void }>) {
  return (
    <Alert tone="error">
      <p style={{ margin: 0 }}>{message}</p>
      {onResend && (
        <button type="button" onClick={onResend} className="tp-link-button" style={{ marginTop: 6 }}>
          Send me a new verification link
        </button>
      )}
    </Alert>
  );
}
