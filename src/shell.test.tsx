import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SwappableShell } from './shell';
import { recipe } from './app';

describe('replaceable shell boundary', () => {
  it('renders an alternate shell without changing block mount contracts', () => {
    const Alternate = ({ children }: import('./host').ShellProps) => <div data-verify="alternate-shell">{children}</div>;
    const html = renderToStaticMarkup(<SwappableShell recipe={recipe} active="/fixture" onNavigate={() => undefined} Shell={Alternate}>block</SwappableShell>);
    expect(html).toContain('data-verify="alternate-shell"');
    expect(html).toContain('block');
  });
});
