import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fixtureUiReadModel } from '../app';
import { LoginSurface } from '../login/login-variants';
import { ProductSurface } from '../routes/product-routes';

describe('Super SaaS source surfaces', () => {
  it('keeps every login presentation disconnected when no auth action is supplied', () => {
    for (const variant of ['focused', 'split', 'compact'] as const) {
      const html = renderToStaticMarkup(
        <LoginSurface variant={variant} onVariantChange={() => undefined} onOpenFixture={() => undefined} />,
      );
      expect(html).toContain(`data-login-variant="${variant}"`);
      expect(html).toContain('No authentication or session claim');
      expect(html).toContain('data-evidence-state="unavailable"');
    }
  });

  it('labels dashboard defaults as fixture or unavailable readbacks', () => {
    const html = renderToStaticMarkup(
      <ProductSurface path="/" model={fixtureUiReadModel()} actions={{}} onNavigate={() => undefined} />,
    );
    expect(html).toContain('data-verify="dashboard-surface"');
    expect(html).toContain('Fixture data');
    expect(html).toContain('Runtime unavailable');
    expect(html).toContain('All entries are registered in fixture source.');
    expect(html).toContain('No persistence claim.');
  });

  it('renders billing without inventing a plan, subscription, checkout or portal action', () => {
    const html = renderToStaticMarkup(
      <ProductSurface path="/settings/billing" model={fixtureUiReadModel()} actions={{}} onNavigate={() => undefined} />,
    );
    expect(html).toContain('data-verify="billing-settings-surface"');
    expect(html).toContain('No subscription readback');
    expect(html).toContain('No checkout or billing portal action');
    expect(html).toContain('Runtime unavailable');
  });
});
