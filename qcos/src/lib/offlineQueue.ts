// Lightweight offline capture queue. When a brain-dump POST fails because
// the device is offline, the entry goes here (localStorage, so it survives
// a reload) instead of being lost. OfflineSync flushes it the moment the
// browser reports it's back online.

const STORAGE_KEY = "qcos-pending-entries";

export interface QueuedEntry {
  id: string;
  content: string;
  queuedAt: string;
}

function readQueue(): QueuedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable (private browsing, quota) - the entry is lost,
    // but the form still told the user capture failed, so nothing silent.
  }
}

export function queueEntry(content: string): QueuedEntry {
  const entry: QueuedEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    queuedAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), entry]);
  return entry;
}

export function getQueuedEntries(): QueuedEntry[] {
  return readQueue();
}

export function removeQueuedEntry(id: string) {
  writeQueue(readQueue().filter((e) => e.id !== id));
}

export function queuedCount(): number {
  return readQueue().length;
}
