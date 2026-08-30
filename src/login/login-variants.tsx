import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Blocks, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { actionFeedbackClass, type LoginIntent, type UiActionResult } from '../ui/product-types';
import { TruthLabel } from '../ui/truth-label';

export type LoginVariant = 'focused' | 'split' | 'compact';

export type LoginSurfaceProps = {
  variant: LoginVariant;
  onVariantChange: (variant: LoginVariant) => void;
  onSubmit?: (intent: LoginIntent) => Promise<UiActionResult>;
  onOpenFixture: () => void;
};

const VARIANTS: Array<{ id: LoginVariant; label: string }> = [
  { id: 'focused', label: 'Focused' },
  { id: 'split', label: 'Split' },
  { id: 'compact', label: 'Compact' },
];

function VariantPicker({ active, onChange }: { active: LoginVariant; onChange: (variant: LoginVariant) => void }) {
  return (
    <nav className="login-variants" aria-label="Login presentation variants">
      {VARIANTS.map((variant) => (
        <button
          type="button"
          key={variant.id}
          className={variant.id === active ? 'is-active' : ''}
          aria-current={variant.id === active ? 'page' : undefined}
          onClick={() => onChange(variant.id)}
        >
          {variant.label}
        </button>
      ))}
    </nav>
  );
}

function LoginForm({ onSubmit, compact = false }: { onSubmit?: LoginSurfaceProps['onSubmit']; compact?: boolean }) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UiActionResult | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setResult({ ok: false, evidenceState: 'unavailable', message: 'Enter an email and password to form a login intent.' });
      return;
    }
    if (!onSubmit) {
      setResult({ ok: false, evidenceState: 'unavailable', message: 'Authentication adapter not connected. This preview cannot sign you in.' });
      return;
    }
    setBusy(true);
    try {
      setResult(await onSubmit({ email: email.trim(), password }));
    } catch (error) {
      setResult({
        ok: false,
        evidenceState: 'unavailable',
        message: error instanceof Error ? error.message : 'The authentication adapter did not return a result.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`login-form${compact ? ' login-form--compact' : ''}`} onSubmit={submit} noValidate>
      <div className="login-form__heading">
        <span className="product-kicker">Workspace access</span>
        <h1>Continue to Actionist</h1>
        <p>Use your organisation credentials when a Base auth adapter is connected.</p>
      </div>
      <div className="login-form__fields">
        <label htmlFor={emailId}>Work email</label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>
      <button className="ui-button ui-button--primary ui-button--wide" type="submit" disabled={busy}>
        <span>{busy ? 'Checking adapter' : 'Continue'}</span>
        <ArrowRight aria-hidden="true" />
      </button>
      <div className="login-form__truth">
        <TruthLabel state="unavailable" compact />
        <span>No authentication or session claim is made by this source preview.</span>
      </div>
      {result && (
        <div className={actionFeedbackClass(result)} role="status" aria-live="polite" data-action-result={result.evidenceState}>
          {result.message}
        </div>
      )}
    </form>
  );
}

function LoginFrame({ children, variant, onVariantChange, onOpenFixture }: { children: ReactNode } & Pick<LoginSurfaceProps, 'variant' | 'onVariantChange' | 'onOpenFixture'>) {
  return (
    <main className={`login-page login-page--${variant}`} data-verify="login-surface" data-login-variant={variant}>
      <header className="login-page__topbar">
        <button type="button" className="login-brand" onClick={onOpenFixture} aria-label="Open Actionist source fixture">
          <span aria-hidden="true">A</span>
          <strong>Actionist</strong>
        </button>
        <VariantPicker active={variant} onChange={onVariantChange} />
        <button type="button" className="ui-button ui-button--quiet login-fixture-link" onClick={onOpenFixture}>
          View source fixture
        </button>
      </header>
      {children}
    </main>
  );
}

export function LoginSurface({ variant, onVariantChange, onSubmit, onOpenFixture }: LoginSurfaceProps) {
  if (variant === 'split') {
    return (
      <LoginFrame variant={variant} onVariantChange={onVariantChange} onOpenFixture={onOpenFixture}>
        <div className="login-split">
          <section className="login-story" aria-label="Product context">
            <div className="login-story__mark"><Sparkles aria-hidden="true" /></div>
            <span className="product-kicker">One product shell</span>
            <h2>Bring focused tools into one accountable workspace.</h2>
            <p>Blocks keep their own lifecycle. Base owns the shell, boundaries and evidence that make them legible.</p>
            <div className="login-story__proof">
              <span><Blocks aria-hidden="true" /> Replaceable blocks</span>
              <span><ShieldCheck aria-hidden="true" /> Explicit authority</span>
            </div>
          </section>
          <section className="login-panel"><LoginForm onSubmit={onSubmit} /></section>
        </div>
      </LoginFrame>
    );
  }

  if (variant === 'compact') {
    return (
      <LoginFrame variant={variant} onVariantChange={onVariantChange} onOpenFixture={onOpenFixture}>
        <div className="login-compact-wrap">
          <div className="login-compact-mark" aria-hidden="true"><KeyRound /></div>
          <LoginForm onSubmit={onSubmit} compact />
        </div>
      </LoginFrame>
    );
  }

  return (
    <LoginFrame variant={variant} onVariantChange={onVariantChange} onOpenFixture={onOpenFixture}>
      <div className="login-focused-wrap">
        <div className="login-focused-aura" aria-hidden="true" />
        <section className="login-panel"><LoginForm onSubmit={onSubmit} /></section>
        <p className="login-page__footnote">Presentation variant only. Authentication remains a Base SaaS responsibility.</p>
      </div>
    </LoginFrame>
  );
}
