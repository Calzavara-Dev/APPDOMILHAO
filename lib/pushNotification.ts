// lib/pushNotification.ts
// Gerencia Web Push Notifications nativas do browser

export type NotifPermission = 'default' | 'granted' | 'denied';

/**
 * Retorna a permissão atual sem solicitar
 */
export function getNotifPermission(): NotifPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission as NotifPermission;
}

/**
 * Solicita permissão de notificação ao usuário
 */
export async function requestPermission(): Promise<NotifPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result as NotifPermission;
}

/**
 * Dispara notificação nativa do browser
 */
export function sendNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string }
): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: options?.icon ?? '/icon-192.png',
      tag: options?.tag ?? 'spreadtrader-alert',
    });
  } catch { /* iOS Safari pode bloquear */ }
}

/**
 * Verifica se uma condição de alerta foi atingida e dispara notificação
 */
export function checkAndNotify(
  pair: string,
  zScore: number,
  zThreshold = 1.5
): void {
  if (Math.abs(zScore) >= zThreshold) {
    const direction = zScore <= -zThreshold ? '🟢 LONG (Compra Spread)' : '🔴 SHORT (Venda Spread)';
    sendNotification(
      `⚡ SpreadTrader — Sinal ${direction}`,
      `Par ${pair}: Z-Score = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)} σ — Spread fora da faixa central.`,
      { tag: `signal-${pair}` }
    );
  }
}
