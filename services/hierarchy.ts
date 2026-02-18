import type { CompanyMemberRecord } from '../types.ts';

export type MemberByUsername = Map<string, CompanyMemberRecord>;

export const normalizeUsername = (v: string) => v.toLowerCase().trim();

export const buildMemberIndex = (members: CompanyMemberRecord[]): MemberByUsername => {
  const map = new Map<string, CompanyMemberRecord>();
  for (const m of members) map.set(normalizeUsername(m.username), m);
  return map;
};

export const buildChildrenMap = (members: CompanyMemberRecord[]): Map<string, string[]> => {
  const children = new Map<string, string[]>();

  const ensure = (u: string) => {
    const key = normalizeUsername(u);
    if (!children.has(key)) children.set(key, []);
    return key;
  };

  for (const m of members) {
    const username = normalizeUsername(m.username);
    ensure(username);

    const leader = m.leaderUsername ? normalizeUsername(m.leaderUsername) : '';
    if (!leader) continue;

    ensure(leader);
    children.get(leader)!.push(username);
  }

  return children;
};

export const getDescendants = (childrenMap: Map<string, string[]>, rootUsername: string): Set<string> => {
  const root = normalizeUsername(rootUsername);
  const visited = new Set<string>();
  const stack: string[] = [...(childrenMap.get(root) || [])];

  while (stack.length) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    const kids = childrenMap.get(cur) || [];
    for (const k of kids) stack.push(k);
  }

  return visited;
};

export const canRepointLeader = (members: CompanyMemberRecord[], targetUsername: string, newLeaderUsername: string | null | undefined) => {
  const target = normalizeUsername(targetUsername);
  const nextLeader = newLeaderUsername ? normalizeUsername(newLeaderUsername) : '';

  if (!nextLeader) return { ok: true };
  if (nextLeader === target) return { ok: false, reason: 'leader_self' as const };

  const childrenMap = buildChildrenMap(members);
  const descendants = getDescendants(childrenMap, target);
  if (descendants.has(nextLeader)) return { ok: false, reason: 'leader_cycle' as const };

  return { ok: true };
};
