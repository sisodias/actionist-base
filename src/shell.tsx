import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  BarChart3,
  BookOpen,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Grid2X2,
  Home,
  Layers3,
  ListTodo,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroup, NavItem, ProductRecipe, ShellComponent, ShellProps } from './host';
import { resolveThemeMode, resolveTokenStyle } from './tokens';

export const SHELL_SEARCH_EVENT = 'actionist:open-search';
export const SHELL_STORAGE_KEY = 'actionist.shell.rail-collapsed';
const MOBILE_BREAKPOINT = '(max-width: 760px)';

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  knowledge: BookOpen,
  fixture: Box,
  settings: Settings,
  calendar: CalendarDays,
  grid: Grid2X2,
  layers: Layers3,
  list: ListTodo,
  file: FileText,
  sparkles: Sparkles,
  users: UsersRound,
  chart: BarChart3,
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readShellCollapsedPreference(): boolean {
  try {
    return storage()?.getItem(SHELL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeShellCollapsedPreference(collapsed: boolean): void {
  try {
    storage()?.setItem(SHELL_STORAGE_KEY, String(collapsed));
  } catch {
    // The shell remains usable when storage is disabled or unavailable.
  }
}

function iconFor(item: NavItem): LucideIcon {
  return (item.icon ? ICONS[item.icon] : undefined) ?? Box;
}

export function isRouteActive(active: string | undefined, route: string): boolean {
  const current = (active || '/').replace(/\/$/, '') || '/';
  const target = route.replace(/\/$/, '') || '/';
  return target === '/' ? current === '/' : current === target || current.startsWith(`${target}/`);
}

function navigationItems(recipe: ProductRecipe): NavItem[] {
  return [
    ...recipe.navigation.flatMap((group) => group.items),
    ...(recipe.settings ? [recipe.settings] : []),
  ];
}

function currentItem(recipe: ProductRecipe, active: string | undefined): NavItem | undefined {
  return navigationItems(recipe)
    .filter((item) => isRouteActive(active, item.route))
    .sort((left, right) => right.route.length - left.route.length)[0];
}

function useMobileViewport(): boolean {
  const getValue = () => {
    if (typeof window === 'undefined') return false;
    if (typeof window.matchMedia === 'function') return window.matchMedia(MOBILE_BREAKPOINT).matches;
    return window.innerWidth <= 760;
  };
  const [isMobile, setIsMobile] = useState(getValue);

  useEffect(() => {
    const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_BREAKPOINT)
      : null;
    const update = () => setIsMobile(media ? media.matches : window.innerWidth <= 760);
    update();
    media?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      media?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isMobile;
}

function dispatchSearchRequest(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SHELL_SEARCH_EVENT));
}

function scheduleFrame(callback: () => void): void {
  if (typeof window === 'undefined') return;
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(callback);
  else window.setTimeout(callback, 0);
}

function SearchTrigger({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="shell-rail__search"
      onClick={onClick}
      aria-label="Open search"
      title="Jump to anything (⌘K)"
      data-shell-search="rail-trigger"
    >
      <Search className="shell-rail__search-icon" aria-hidden="true" />
      {!collapsed && <span className="shell-rail__search-label">Search…</span>}
      {!collapsed && <kbd className="shell-rail__search-shortcut">⌘K</kbd>}
    </button>
  );
}

function GroupedNavigation({
  active,
  groups,
  collapsedGroups,
  onNavigate,
  onToggleGroup,
}: {
  active?: string;
  groups: NavGroup[];
  collapsedGroups: Record<string, boolean>;
  onNavigate: (route: string) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <div className="shell-rail__navigation" data-verify-nav-groups={groups.length}>
      {groups.map((group) => {
        const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
        const headingId = `actionist-nav-group-${group.id}`;
        return (
          <section className="shell-rail__nav-group" key={group.id} aria-labelledby={headingId}>
            {group.collapsible ? (
              <button
                type="button"
                className="shell-rail__group-heading shell-rail__group-toggle"
                onClick={() => onToggleGroup(group.id)}
                aria-expanded={!isGroupCollapsed}
                aria-controls={`actionist-nav-items-${group.id}`}
              >
                {isGroupCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                <span id={headingId}>{group.label}</span>
              </button>
            ) : (
              <h2 className="shell-rail__group-heading" id={headingId}>{group.label}</h2>
            )}
            {!isGroupCollapsed && (
              <div className="shell-rail__nav-items" id={`actionist-nav-items-${group.id}`}>
                {group.items.map((item) => {
                  const Icon = iconFor(item);
                  const isActive = isRouteActive(active, item.route);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`shell-rail__nav-link${isActive ? ' is-active' : ''}`}
                      onClick={() => onNavigate(item.route)}
                      data-verify={`nav-${item.id}`}
                      data-active={String(isActive)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CompactNavigation({ active, groups, onNavigate }: { active?: string; groups: NavGroup[]; onNavigate: (route: string) => void }) {
  const destinations = groups.flatMap((group) => group.items);
  return (
    <div
      className="shell-rail__compact-navigation"
      aria-label="Page navigation"
      data-verify-compact-destinations={destinations.length}
    >
      {destinations.map((item) => {
        const Icon = iconFor(item);
        const isActive = isRouteActive(active, item.route);
        return (
          <button
            type="button"
            key={item.id}
            className={`shell-rail__compact-link${isActive ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.route)}
            aria-label={item.label}
            title={item.label}
            aria-current={isActive ? 'page' : undefined}
            data-verify={`compact-nav-${item.id}`}
            data-active={String(isActive)}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export function DefaultShell({ recipe, active, children, onNavigate, workspace }: ShellProps) {
  const [collapsed, setCollapsed] = useState(readShellCollapsedPreference);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const isMobile = useMobileViewport();
  const railRef = useRef<HTMLElement>(null);
  const railToggleRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const railId = 'actionist-shell-rail';
  const item = useMemo(() => currentItem(recipe, active), [active, recipe]);
  const homeRoute = recipe.navigation[0]?.items[0]?.route ?? '/';
  const resolvedWorkspace = workspace ?? { name: 'Workspace' };
  const tokenStyle = resolveTokenStyle(recipe.theme) as CSSProperties;

  const toggleRail = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      writeShellCollapsedPreference(next);
      return next;
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    scheduleFrame(() => mobileTriggerRef.current?.focus());
  }, []);

  const navigate = useCallback((route: string) => {
    onNavigate(route);
    setDrawerOpen(false);
  }, [onNavigate]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (isMobile && !drawerOpen) rail.setAttribute('inert', '');
    else rail.removeAttribute('inert');
    return () => rail.removeAttribute('inert');
  }, [drawerOpen, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
      return;
    }
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    scheduleFrame(() => railToggleRef.current?.focus());
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer, drawerOpen, isMobile]);

  const handleBackdropClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget === event.target) closeDrawer();
  };

  return (
    <div
      className={`app-shell${collapsed ? ' app-shell--collapsed' : ' app-shell--expanded'}${drawerOpen ? ' app-shell--drawer-open' : ''}`}
      data-verify="actionist-shell"
      data-shell="actionist"
      data-token-contract="actionist-host-v1"
      data-theme={resolveThemeMode(recipe.theme)}
      data-mobile-drawer={String(drawerOpen)}
      style={tokenStyle}
    >
      <aside
        ref={railRef}
        id={railId}
        className="shell-rail"
        aria-label="Product navigation"
        data-verify="side-rail"
        data-verify-unit="GroupedRail"
        data-verify-direction="B"
        data-verify-expanded-width="232"
        data-verify-collapsed-width="52"
        data-verify-collapsed={String(collapsed)}
        data-rail-state={collapsed ? 'compact' : 'expanded'}
      >
        <div className="shell-rail__bloom" aria-hidden="true" />
        <div className="shell-rail__noise" aria-hidden="true" />

        <header className="shell-rail__header">
          <button type="button" className="shell-rail__brand" onClick={() => navigate(homeRoute)} aria-label={`${recipe.name} home`} title={`${recipe.name} home`}>
            <span aria-hidden="true">{recipe.name.trim().charAt(0).toUpperCase() || 'A'}</span>
          </button>
          {!collapsed && (
            <div className="shell-rail__identity">
              <span className="shell-rail__product-name">{recipe.name}</span>
              <span className="shell-rail__product-subtitle">{recipe.subtitle}</span>
            </div>
          )}
          <button
            ref={railToggleRef}
            type="button"
            onClick={toggleRail}
            className="shell-rail__toggle"
            aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </header>

        <SearchTrigger collapsed={collapsed} onClick={dispatchSearchRequest} />

        <nav className="shell-rail__body" aria-label="Grouped page navigation">
          {collapsed ? (
            <CompactNavigation active={active} groups={recipe.navigation} onNavigate={navigate} />
          ) : (
            <GroupedNavigation
              active={active}
              groups={recipe.navigation}
              collapsedGroups={collapsedGroups}
              onNavigate={navigate}
              onToggleGroup={(groupId) => setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }))}
            />
          )}
        </nav>

        {recipe.settings && (
          <button
            type="button"
            className={`shell-rail__settings${isRouteActive(active, recipe.settings.route) ? ' is-active' : ''}`}
            onClick={() => navigate(recipe.settings!.route)}
            data-verify="nav-settings"
            aria-label={recipe.settings.label}
            title={recipe.settings.label}
            aria-current={isRouteActive(active, recipe.settings.route) ? 'page' : undefined}
          >
            {(() => { const Icon = iconFor(recipe.settings!); return <Icon aria-hidden="true" />; })()}
            <span>{recipe.settings.label}</span>
          </button>
        )}

        <div className="shell-rail__workspace-dock" data-verify="workspace-dock" title={resolvedWorkspace.id}>
          <span className="shell-rail__workspace-mark" aria-hidden="true">{resolvedWorkspace.name.trim().charAt(0).toUpperCase() || 'W'}</span>
          <span className="shell-rail__workspace-copy">
            <strong>{resolvedWorkspace.name}</strong>
            <small>{resolvedWorkspace.detail ?? 'Active workspace'}</small>
          </span>
        </div>
      </aside>

      {isMobile && drawerOpen && (
        <button type="button" className="shell-drawer-backdrop" aria-label="Close navigation" onClick={handleBackdropClick} />
      )}

      <div className="shell-workspace">
        <header className="shell-topbar">
          <div className="shell-topbar__leading">
            <button
              ref={mobileTriggerRef}
              type="button"
              className="shell-mobile-trigger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-controls={railId}
              aria-expanded={drawerOpen}
            >
              <Menu aria-hidden="true" />
            </button>
            <div className="shell-breadcrumb" data-verify="active-route">
              <span>{recipe.name}</span>
              <ChevronRight aria-hidden="true" />
              <strong>{item?.label ?? recipe.subtitle}</strong>
            </div>
          </div>
          <div className="shell-topbar__actions">
            <div className="shell-workspace-summary" data-verify="workspace" data-workspace-id={resolvedWorkspace.id}>
              <span>Workspace</span>
              <strong>{resolvedWorkspace.name}</strong>
            </div>
            <button type="button" className="shell-search-button" onClick={dispatchSearchRequest} aria-label="Open global search">
              <Search aria-hidden="true" /><span>Search</span><kbd>⌘K</kbd>
            </button>
          </div>
        </header>

        <main className="shell-main">
          <div data-verify="content-canvas" data-content-mount="host" className="shell-canvas">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function SwappableShell(props: ShellProps & { Shell?: ShellComponent }) {
  const Shell = props.Shell ?? DefaultShell;
  return <Shell {...props} />;
}
