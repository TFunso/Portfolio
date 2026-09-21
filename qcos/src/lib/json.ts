export function toJson<T>(value: T[]): string {
  return JSON.stringify(value);
}

export function fromJson<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
