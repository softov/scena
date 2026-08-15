import { navigate } from '../use-url-path.js';
import './boot-page.css';

// Public boot route at /cadastre. Scena is NOT loaded here — neither the
// runtime nor any registered surfaces. This module + use-url-path are the
// whole dependency surface for unauthenticated signup.

export function CadastrePage() {
  return (
    <div className="boot-page">
      <div className="boot-page__panel">
        <h1>Create your account</h1>
        <p>
          This is a public route (<code>/cadastre</code>). Scena's runtime,
          the wall, and the shell are all unloaded. Only this page module is
          in the bundle for visitors who hit /cadastre directly.
        </p>
        <p>
          (Wire your real signup form here. It would POST to your backend
          and, on success, write the resulting session to{' '}
          <code>$/sigillum/session</code> via a Porta provider's signin —
          then navigate back to <code>/</code>.)
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
