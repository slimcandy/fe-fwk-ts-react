function mapsDiff<K, V>(
  oldMap: Map<K, V>,
  newMap: Map<K, V>
): {
  added: K[];
  removed: K[];
  updated: K[];
} {
  const oldKeys = Array.from(oldMap.keys());
  const newKeys = Array.from(newMap.keys());

  return {
    added: newKeys.filter((key) => !oldMap.has(key)),
    removed: oldKeys.filter((key) => !newMap.has(key)),
    updated: newKeys.filter(
      (key) => oldMap.has(key) && oldMap.get(key) !== newMap.get(key)
    ),
  };
}

function makeCountMap<T>(array: T[]): Map<T, number> {
  const map = new Map<T, number>();

  for (const item of array) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }

  return map;
}

export { mapsDiff, makeCountMap };
