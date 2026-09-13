import type { LngLat } from "@/lib/types";

export type ClusterLeaf<T> = {
  kind: "leaf";
  id: string;
  coords: LngLat;
  item: T;
};

export type ClusterGroup<T> = {
  kind: "group";
  id: string;
  coords: LngLat;
  count: number;
  items: T[];
};

export type ClusterNode<T> = ClusterLeaf<T> | ClusterGroup<T>;

/**
 * Greedy pixel clustering. At globe zoom, nearby pins collapse into a count
 * disc; at city zoom the same radius stops matching and every pin is a leaf.
 */
export function clusterInPixels<T extends { id: string; coords: LngLat }>(
  items: T[],
  project: (lng: number, lat: number) => { x: number; y: number },
  radiusPx: number,
): ClusterNode<T>[] {
  const remaining = [...items];
  const nodes: ClusterNode<T>[] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const origin = project(seed.coords.lng, seed.coords.lat);
    const members = [seed];
    const reach = radiusPx * radiusPx;

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index];
      const point = project(candidate.coords.lng, candidate.coords.lat);
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      if (dx * dx + dy * dy <= reach) {
        members.push(candidate);
        remaining.splice(index, 1);
      }
    }

    if (members.length === 1) {
      nodes.push({
        kind: "leaf",
        id: seed.id,
        coords: seed.coords,
        item: seed,
      });
      continue;
    }

    const lng =
      members.reduce((sum, member) => sum + member.coords.lng, 0) /
      members.length;
    const lat =
      members.reduce((sum, member) => sum + member.coords.lat, 0) /
      members.length;

    nodes.push({
      kind: "group",
      id: members
        .map((member) => member.id)
        .sort()
        .join("+"),
      coords: { lng, lat },
      count: members.length,
      items: members,
    });
  }

  return nodes;
}
