/**
 * The host token contract.
 *
 * Components and installed blocks consume these semantic names through the
 * inherited CSS custom properties. Product recipes may override a semantic
 * value, but they do not introduce component- or product-specific variables.
 */
export const HOST_TOKEN_MAP = {
  surfaceCanvas: '--actionist-surface-canvas',
  surfaceChrome: '--actionist-surface-chrome',
  surfacePanel: '--actionist-surface-panel',
  surfaceRaised: '--actionist-surface-raised',
  surfaceHover: '--actionist-surface-hover',
  surfaceRail: '--actionist-surface-rail',
  surfaceRailBorder: '--actionist-surface-rail-border',
  surfaceRailBloom: '--actionist-surface-rail-bloom',
  surfaceRailActive: '--actionist-surface-rail-active',
  surfaceRailControl: '--actionist-surface-rail-control',
  surfaceRailSearch: '--actionist-surface-rail-search',
  surfaceRailCapsule: '--actionist-surface-rail-capsule',
  surfaceRailBrand: '--actionist-surface-rail-brand',
  surfaceRailHover: '--actionist-surface-rail-hover',
  surfaceProfile: '--actionist-surface-profile',
  surfaceProfileBorder: '--actionist-surface-profile-border',
  surfaceProfileOrb: '--actionist-surface-profile-orb',
  surfaceOverlay: '--actionist-surface-overlay',

  textPrimary: '--actionist-text-primary',
  textStrong: '--actionist-text-strong',
  textMuted: '--actionist-text-muted',
  textFaint: '--actionist-text-faint',
  textInverse: '--actionist-text-inverse',

  borderSubtle: '--actionist-border-subtle',
  borderDefault: '--actionist-border-default',
  borderStrong: '--actionist-border-strong',
  borderFocus: '--actionist-border-focus',

  actionPrimary: '--actionist-action-primary',
  actionPrimaryHover: '--actionist-action-primary-hover',
  actionPrimaryPressed: '--actionist-action-primary-pressed',
  actionOnPrimary: '--actionist-action-on-primary',

  statusPositive: '--actionist-status-positive',
  statusWarning: '--actionist-status-warning',
  statusDanger: '--actionist-status-danger',
  statusInfo: '--actionist-status-info',

  typeFontSans: '--actionist-type-font-sans',
  typeFontMono: '--actionist-type-font-mono',
  typeSize2xs: '--actionist-type-size-2xs',
  typeSizeXs: '--actionist-type-size-xs',
  typeSizeSm: '--actionist-type-size-sm',
  typeSizeMd: '--actionist-type-size-md',
  typeSizeLg: '--actionist-type-size-lg',
  typeSizeXl: '--actionist-type-size-xl',
  typeSizeDisplay: '--actionist-type-size-display',
  typeWeightRegular: '--actionist-type-weight-regular',
  typeWeightMedium: '--actionist-type-weight-medium',
  typeWeightSemibold: '--actionist-type-weight-semibold',
  typeWeightBold: '--actionist-type-weight-bold',
  typeTrackingLabel: '--actionist-type-tracking-label',
  typeTrackingKicker: '--actionist-type-tracking-kicker',
  typeLeadingRelaxed: '--actionist-type-leading-relaxed',

  space0: '--actionist-space-0',
  spaceHalf: '--actionist-space-half',
  space1: '--actionist-space-1',
  space1_5: '--actionist-space-1-5',
  space2: '--actionist-space-2',
  space2_5: '--actionist-space-2-5',
  space3: '--actionist-space-3',
  space4: '--actionist-space-4',
  space5: '--actionist-space-5',
  space6: '--actionist-space-6',
  space7: '--actionist-space-7',
  space8: '--actionist-space-8',
  space10: '--actionist-space-10',
  space12: '--actionist-space-12',
  space16: '--actionist-space-16',
  space17_5: '--actionist-space-17-5',

  radiusXs: '--actionist-radius-xs',
  radiusSm: '--actionist-radius-sm',
  radiusControl: '--actionist-radius-control',
  radiusControlLg: '--actionist-radius-control-lg',
  radiusCard: '--actionist-radius-card',
  radiusPanel: '--actionist-radius-panel',
  radiusRail: '--actionist-radius-rail',
  radiusRailInner: '--actionist-radius-rail-inner',
  radiusPill: '--actionist-radius-pill',
  radiusRound: '--actionist-radius-round',

  motionFast: '--actionist-motion-fast',
  motionNormal: '--actionist-motion-normal',
  motionSlow: '--actionist-motion-slow',
  motionEasing: '--actionist-motion-easing',

  geometryRailWidth: '--actionist-geometry-rail-width',
  geometryRailCollapsedWidth: '--actionist-geometry-rail-collapsed-width',
  geometryRailInset: '--actionist-geometry-rail-inset',
  geometryControlTouch: '--actionist-geometry-control-touch',
  geometryNavRowHeight: '--actionist-geometry-nav-row-height',
  geometryTopbarHeight: '--actionist-geometry-topbar-height',
  geometryProfileHeight: '--actionist-geometry-profile-height',
  geometryIconXs: '--actionist-geometry-icon-xs',
  geometryIconSm: '--actionist-geometry-icon-sm',
  geometryIconMd: '--actionist-geometry-icon-md',
  geometryIconLg: '--actionist-geometry-icon-lg',

  shadowNone: '--actionist-shadow-none',
  shadowFocus: '--actionist-shadow-focus',
  shadowModal: '--actionist-shadow-modal',
  shadowRail: '--actionist-shadow-rail',
  shadowRailInner: '--actionist-shadow-rail-inner',
  shadowControl: '--actionist-shadow-control',
  shadowSearch: '--actionist-shadow-search',
  shadowCapsule: '--actionist-shadow-capsule',
  shadowActive: '--actionist-shadow-active',
  shadowActiveIcon: '--actionist-shadow-active-icon',
  shadowBrand: '--actionist-shadow-brand',
  shadowProfile: '--actionist-shadow-profile',
  shadowProfileOrb: '--actionist-shadow-profile-orb',
  shadowStatus: '--actionist-shadow-status',
  shadowKicker: '--actionist-shadow-kicker',

  gradientCanvas: '--actionist-gradient-canvas',
  gradientTopbarLine: '--actionist-gradient-topbar-line',
  gradientRailShell: '--actionist-gradient-rail-shell',
  gradientRailBorder: '--actionist-gradient-rail-border',
  gradientRailBloom: '--actionist-gradient-rail-bloom',
  gradientRailEdge: '--actionist-gradient-rail-edge',
  gradientRailActive: '--actionist-gradient-rail-active',
  gradientRailControl: '--actionist-gradient-rail-control',
  gradientRailSearch: '--actionist-gradient-rail-search',
  gradientRailCapsule: '--actionist-gradient-rail-capsule',
  gradientRailBrand: '--actionist-gradient-rail-brand',
  gradientRailHover: '--actionist-gradient-rail-hover',
  gradientProfile: '--actionist-gradient-profile',
  gradientProfileBorder: '--actionist-gradient-profile-border',
  gradientProfileOverlay: '--actionist-gradient-profile-overlay',
  gradientProfileRings: '--actionist-gradient-profile-rings',
  gradientProfileOrb: '--actionist-gradient-profile-orb',
  gradientActiveIcon: '--actionist-gradient-active-icon',
  textureRailNoise: '--actionist-texture-rail-noise',
  blurGlass: '--actionist-blur-glass',
  blurTopbar: '--actionist-blur-topbar',
  blurModal: '--actionist-blur-modal',
} as const;

export type HostTokenName = keyof typeof HOST_TOKEN_MAP;
export type SemanticTokenValues = { [Name in HostTokenName]: string };
export type ThemeMode = 'light' | 'dark' | 'system';
export type ProductTheme = {
  mode?: ThemeMode;
  overrides?: Partial<SemanticTokenValues>;
};

export const TOKEN_CATEGORIES = {
  surface: [
    'surfaceCanvas', 'surfaceChrome', 'surfacePanel', 'surfaceRaised', 'surfaceHover',
    'surfaceRail', 'surfaceRailBorder', 'surfaceRailBloom', 'surfaceRailActive',
    'surfaceRailControl', 'surfaceRailSearch', 'surfaceRailCapsule', 'surfaceRailBrand',
    'surfaceRailHover', 'surfaceProfile', 'surfaceProfileBorder', 'surfaceProfileOrb',
    'surfaceOverlay',
  ],
  text: ['textPrimary', 'textStrong', 'textMuted', 'textFaint', 'textInverse'],
  border: ['borderSubtle', 'borderDefault', 'borderStrong', 'borderFocus'],
  action: ['actionPrimary', 'actionPrimaryHover', 'actionPrimaryPressed', 'actionOnPrimary'],
  status: ['statusPositive', 'statusWarning', 'statusDanger', 'statusInfo'],
  type: [
    'typeFontSans', 'typeFontMono', 'typeSize2xs', 'typeSizeXs', 'typeSizeSm', 'typeSizeMd',
    'typeSizeLg', 'typeSizeXl', 'typeSizeDisplay', 'typeWeightRegular', 'typeWeightMedium',
    'typeWeightSemibold', 'typeWeightBold', 'typeTrackingLabel', 'typeTrackingKicker',
    'typeLeadingRelaxed',
  ],
  space: [
    'space0', 'spaceHalf', 'space1', 'space1_5', 'space2', 'space2_5', 'space3', 'space4',
    'space5', 'space6', 'space7', 'space8', 'space10', 'space12', 'space16', 'space17_5',
  ],
  radius: [
    'radiusXs', 'radiusSm', 'radiusControl', 'radiusControlLg', 'radiusCard', 'radiusPanel',
    'radiusRail', 'radiusRailInner', 'radiusPill', 'radiusRound',
  ],
  motion: ['motionFast', 'motionNormal', 'motionSlow', 'motionEasing'],
  geometry: [
    'geometryRailWidth', 'geometryRailCollapsedWidth', 'geometryRailInset', 'geometryControlTouch',
    'geometryNavRowHeight', 'geometryTopbarHeight', 'geometryProfileHeight', 'geometryIconXs',
    'geometryIconSm', 'geometryIconMd', 'geometryIconLg',
  ],
} as const satisfies Readonly<Record<string, readonly HostTokenName[]>>;

export const DEFAULT_THEME = { mode: 'dark' } as const satisfies ProductTheme;

export function resolveThemeMode(theme?: ProductTheme): ThemeMode {
  return theme?.mode ?? DEFAULT_THEME.mode;
}

/** Convert recipe overrides into the only CSS variables the host exposes. */
export function resolveTokenStyle(theme?: ProductTheme): Record<string, string> {
  const style: Record<string, string> = {};
  const overrides = theme?.overrides ?? {};

  for (const name of Object.keys(HOST_TOKEN_MAP) as HostTokenName[]) {
    const value = overrides[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      style[HOST_TOKEN_MAP[name]] = value;
    }
  }

  return style;
}

/** Use this helper when a block needs a token in an inline style or adapter. */
export function hostToken(name: HostTokenName): string {
  return `var(${HOST_TOKEN_MAP[name]})`;
}
