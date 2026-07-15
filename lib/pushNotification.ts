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
 * Verifica se uma camada gaussiana foi atingida e dispara notificação adaptada ao modo operacional
 */
export function checkAndNotify(
  pair: string,
  zScore: number,
  operationMode: 'custody_swap' | 'traditional_ls' = 'custody_swap'
): void {
  const absZ = Math.abs(zScore);
  const signStr = zScore >= 0 ? '+' : '';
  const [s1, s2] = pair.split('_').length === 2 ? pair.split('_') : pair.split('/');

  // Determinar qual camada foi atingida
  let layerLabel = '';
  let actionLabel = '';

  if (absZ >= 2.0) {
    layerLabel = 'Camada Extrema (±2.0 σ)';
  } else if (absZ >= 1.5) {
    layerLabel = 'Camada de Operação (±1.5 σ)';
  } else if (absZ >= 1.0) {
    layerLabel = 'Camada Intermediária (±1.0 σ)';
  } else if (absZ <= 0.3) {
    layerLabel = 'Convergência à Média (Equilíbrio 0.0 σ)';
  }

  if (!layerLabel) return; // Fora dos gatilhos de notificação

  if (operationMode === 'custody_swap') {
    // Modo Troca de Custódia (Sem Short / Sem Aluguel)
    if (absZ <= 0.3) {
      actionLabel = `🏁 Desmontar Trade: Retorno à média! Lucro capturado na volta da custódia.`;
    } else if (zScore <= -1.5) {
      actionLabel = `🔄 Troca de Custódia: Vender ${s2 || 'PN'} da carteira e Comprar ${s1 || 'ON'}.`;
    } else if (zScore >= 1.5) {
      actionLabel = `🔄 Troca de Custódia: Vender ${s1 || 'ON'} da carteira e Comprar ${s2 || 'PN'}.`;
    } else {
      actionLabel = `📊 Atingiu ${layerLabel}: Monitorar acumulação na grade.`;
    }
  } else {
    // Long & Short Tradicional
    if (absZ <= 0.3) {
      actionLabel = `🏁 Desmontar Operação: Spread retornou à média gaussiana.`;
    } else if (zScore <= -1.5) {
      actionLabel = `🟢 LONG: Comprar ${s1} / Vender ${s2}`;
    } else if (zScore >= 1.5) {
      actionLabel = `🔴 SHORT: Vender ${s1} / Comprar ${s2}`;
    } else {
      actionLabel = `📊 Atingiu ${layerLabel}: Spread em movimento.`;
    }
  }

  sendNotification(
    `⚡ SpreadTrader — ${layerLabel}`,
    `${pair}: Z-Score = ${signStr}${zScore.toFixed(2)} σ. ${actionLabel}`,
    { tag: `layer-${pair}-${Math.round(absZ * 10)}` }
  );
}

