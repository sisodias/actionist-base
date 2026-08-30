import type { BlockMount, NavGroup, NavItem } from '../host';

export type HostBlockInstallation = {
  block: BlockMount;
  navigation: NavItem & { groupId: string; groupLabel: string };
  audience?: string;
  clientId?: string;
  requiredCapabilities: readonly string[];
};

export class HostBlockRegistry {
  private readonly installations = new Map<string, HostBlockInstallation>();

  install(input: HostBlockInstallation): void {
    const { block, navigation } = input;
    if (this.installations.has(block.id)) throw new Error(`block conflict: ${block.id}`);
    if (block.route === '/' || !block.route.startsWith('/')) throw new Error(`block route must be non-root: ${block.route}`);
    if ([...this.installations.values()].some((candidate) => candidate.block.route === block.route)) {
      throw new Error(`route conflict: ${block.route}`);
    }
    if (navigation.blockId !== block.id) throw new Error(`navigation block mismatch: ${block.id}`);
    if (navigation.route !== block.route) throw new Error(`navigation route mismatch: ${block.route}`);
    this.installations.set(block.id, {
      ...input,
      navigation: { ...navigation },
      requiredCapabilities: [...new Set(input.requiredCapabilities)].sort(),
    });
  }

  uninstall(blockId: string): HostBlockInstallation | undefined {
    const installation = this.installations.get(blockId);
    if (!installation) return undefined;
    this.installations.delete(blockId);
    return cloneInstallation(installation);
  }

  get(blockId: string): HostBlockInstallation | undefined {
    const installation = this.installations.get(blockId);
    return installation ? cloneInstallation(installation) : undefined;
  }

  list(): HostBlockInstallation[] {
    return [...this.installations.values()].map(cloneInstallation);
  }

  resolve(pathname: string): BlockMount | undefined {
    return this.list()
      .map((installation) => installation.block)
      .filter((block) => pathname === block.route || pathname.startsWith(`${block.route}/`))
      .sort((left, right) => right.route.length - left.route.length)[0];
  }

  navigationGroups(grantedCapabilities: readonly string[]): NavGroup[] {
    const grants = new Set(grantedCapabilities);
    const groups = new Map<string, NavGroup>();
    for (const installation of this.installations.values()) {
      if (!installation.requiredCapabilities.every((capability) => grants.has(capability))) continue;
      const { groupId, groupLabel, ...item } = installation.navigation;
      const group = groups.get(groupId) ?? { id: groupId, label: groupLabel, items: [] };
      group.items.push({ ...item });
      groups.set(groupId, group);
    }
    return [...groups.values()].map((group) => ({ ...group, items: [...group.items] }));
  }
}

function cloneInstallation(installation: HostBlockInstallation): HostBlockInstallation {
  return {
    ...installation,
    navigation: { ...installation.navigation },
    requiredCapabilities: [...installation.requiredCapabilities],
  };
}
