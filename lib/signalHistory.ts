// lib/signalHistory.ts
// Persiste histórico de sinais gerados no localStorage do browser

export interface SignalRecord {
  id: string;
  timestamp: string;       // ISO string
  pair: string;            // ex: "PETR3/PETR4"
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  spread: number;
  zScore: number;
  camadaSugestao?: string;
}

const LS_KEY = 'spreadtrader_signal_history';
const MAX_RECORDS = 100;

export function saveSignal(record: Omit<SignalRecord, 'id' | 'timestamp'>): SignalRecord {
  const newRecord: SignalRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = loadSignals();
    // Evita duplicata: mesmo par + sinal nas últimas 2h
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const hasDuplicate = existing.some(
      r =>
        r.pair === newRecord.pair &&
        r.signal === newRecord.signal &&
        new Date(r.timestamp).getTime() > twoHoursAgo
    );
    if (hasDuplicate) return newRecord;

    const updated = [newRecord, ...existing].slice(0, MAX_RECORDS);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch { /* localStorage pode estar indisponível em SSR */ }

  return newRecord;
}

export function loadSignals(): SignalRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SignalRecord[];
  } catch {
    return [];
  }
}

export function clearSignals(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { }
}
