import { navigate } from '../use-url-path.js';
import './boot-page.css';

// Public boot route at /forgot-password. Same load-control story as
// CadastrePage — scena and its deps are NOT in this chunk.

export function ForgotPasswordPage() {
  return (
    <div className="boot-page">
      <div className="boot-page__panel">
        <h1>Reset your password</h1>
        <p>
          Public route (<code>/forgot-password</code>). Wire to your backend's
          password reset flow.
        </p>
        <div className="boot-page__actions">
          <button type="button" onClick={() => navigate('/')}>
            ← Back to sign-in
          </button>
        </div>
      </div>
    </div>
  );
}
