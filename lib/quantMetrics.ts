export interface PairStats {
  correlation: number; // Correlação de Pearson (-1 a +1)
  rSquared: number;    // R² (0 a 1)
  beta: number;        // Coeficiente Beta (Regressão Linear S1 em relação a S2)
  halfLifeDays: number; // Meia-vida estimada (em períodos/dias) para reversão à média
  meanSpread: number;  // Média do Spread no período
  stdDevSpread: number; // Desvio Padrão do Spread
  atr: number;         // Average True Range do Spread (volatilidade média diária)
}

export interface StopLossResult {
  entry1: number;      // Preço de entrada sugerido Ação 1
  entry2: number;      // Preço de entrada sugerido Ação 2
  stopLossSpread: number; // Nível de stop no spread
  takeProfitSpread: number; // Nível de take profit no spread
  qty1: number;        // Quantidade sugerida Ação 1
  qty2: number;        // Quantidade sugerida Ação 2
  riskRewardRatio: number; // Relação risco/retorno
  maxLossReais: number;    // Perda máxima estimada em R$
  maxGainReais: number;    // Ganho máximo estimado em R$
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entrySpread: number;
  exitSpread: number;
  entryZ: number;
  exitZ: number;
  direction: 'LONG' | 'SHORT';
  pnlPct: number;      // P&L em % do spread
  durationDays: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  totalTrades: number;
  winRate: number;
  avgPnlPct: number;
  totalPnlPct: number;
  maxDrawdown: number;
  avgDuration: number;
}

/**
 * Calcula estatísticas quantitativas avançadas para trading de pares (Long & Short)
 */
export function calculatePairStats(
  stock1Data: { date: string; price: number }[],
  stock2Data: { date: string; price: number }[],
  spreadData: { date: string; spread: number }[]
): PairStats {
  const n = Math.min(stock1Data.length, stock2Data.length, spreadData.length);
  if (n < 3) {
    return {
      correlation: 0,
      rSquared: 0,
      beta: 1,
      halfLifeDays: 5,
      meanSpread: 0,
      stdDevSpread: 0,
      atr: 0,
    };
  }

  // 1. Médias de preço
  let sum1 = 0,
    sum2 = 0;
  for (let i = 0; i < n; i++) {
    sum1 += stock1Data[i].price;
    sum2 += stock2Data[i].price;
  }
  const mean1 = sum1 / n;
  const mean2 = sum2 / n;

  // 2. Pearson Correlation & Beta
  let num = 0,
    den1 = 0,
    den2 = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = stock1Data[i].price - mean1;
    const diff2 = stock2Data[i].price - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }

  const correlation =
    den1 > 0 && den2 > 0 ? num / Math.sqrt(den1 * den2) : 0;
  const rSquared = correlation * correlation;
  const beta = den2 > 0 ? num / den2 : 1;

  // 3. Estatísticas do Spread
  let sumSpread = 0;
  for (let i = 0; i < n; i++) {
    sumSpread += spreadData[i].spread;
  }
  const meanSpread = sumSpread / n;

  let varSpread = 0;
  for (let i = 0; i < n; i++) {
    varSpread += Math.pow(spreadData[i].spread - meanSpread, 2);
  }
  const stdDevSpread = n > 1 ? Math.sqrt(varSpread / n) : 1;

  // 4. ATR do Spread (média dos ranges diários absolutos)
  let sumATR = 0;
  for (let i = 1; i < n; i++) {
    sumATR += Math.abs(spreadData[i].spread - spreadData[i - 1].spread);
  }
  const atr = n > 1 ? parseFloat((sumATR / (n - 1)).toFixed(2)) : 0;

  // 5. Meia-Vida do Spread (Ornstein-Uhlenbeck / Autocorrelação AR1)
  let covAR1 = 0;
  let varAR1 = 0;
  for (let i = 1; i < n; i++) {
    const sCurr = spreadData[i].spread - meanSpread;
    const sPrev = spreadData[i - 1].spread - meanSpread;
    covAR1 += sCurr * sPrev;
    varAR1 += sPrev * sPrev;
  }
  let rho = varAR1 > 0 ? covAR1 / varAR1 : 0.85;
  if (rho >= 0.99) rho = 0.98;
  if (rho <= 0.05) rho = 0.05;

  const lambda = -Math.log(rho);
  const halfLifeDays = lambda > 0 ? Math.log(2) / lambda : 3.5;

  return {
    correlation: parseFloat(correlation.toFixed(2)),
    rSquared: parseFloat(rSquared.toFixed(2)),
    beta: parseFloat(beta.toFixed(2)),
    halfLifeDays: parseFloat(halfLifeDays.toFixed(1)),
    meanSpread: parseFloat(meanSpread.toFixed(2)),
    stdDevSpread: parseFloat(stdDevSpread.toFixed(2)),
    atr,
  };
}

/**
 * Calcula Stop Loss, Take Profit e Sizing de Posição para o par
 */
export function calculateStopLossTakeProfit(
  latestSpread: number,
  latestZScore: number,
  stats: PairStats,
  latestPrice1: number,
  latestPrice2: number,
  capitalReais: number
): StopLossResult {
  const { meanSpread, stdDevSpread, atr, beta } = stats;

  // Stop: 1 ATR além do extremo atual na direção da operação
  // Take Profit: retorno à média (picoSpreadCenter ~= meanSpread)
  const atrBuffer = atr > 0 ? atr : stdDevSpread * 0.5;

  let stopLossSpread: number;
  let takeProfitSpread: number;

  if (latestZScore < 0) {
    // LONG spread: entrada baixa, stop ainda mais baixo, TP na média
    stopLossSpread = parseFloat((latestSpread - atrBuffer * 1.5).toFixed(2));
    takeProfitSpread = parseFloat((meanSpread).toFixed(2));
  } else {
    // SHORT spread: entrada alta, stop ainda mais alto, TP na média
    stopLossSpread = parseFloat((latestSpread + atrBuffer * 1.5).toFixed(2));
    takeProfitSpread = parseFloat((meanSpread).toFixed(2));
  }

  const riskSpread = Math.abs(latestSpread - stopLossSpread);
  const rewardSpread = Math.abs(latestSpread - takeProfitSpread);
  const riskRewardRatio = riskSpread > 0 ? parseFloat((rewardSpread / riskSpread).toFixed(2)) : 0;

  // Sizing: quanto comprar de cada ativo com o capital disponível
  // Usamos beta para balancear: qty2 = qty1 * beta * (price1/price2)
  const halfCapital = capitalReais / 2;
  const qty1 = latestPrice1 > 0 ? Math.floor(halfCapital / latestPrice1) : 0;
  const qty2 = (latestPrice2 > 0 && beta > 0)
    ? Math.floor((halfCapital * beta) / latestPrice2)
    : 0;

  const maxLossReais = parseFloat((qty1 * riskSpread + qty2 * riskSpread * (1 / beta || 1)).toFixed(2));
  const maxGainReais = parseFloat((qty1 * rewardSpread + qty2 * rewardSpread * (1 / beta || 1)).toFixed(2));

  return {
    entry1: latestPrice1,
    entry2: latestPrice2,
    stopLossSpread,
    takeProfitSpread,
    qty1,
    qty2,
    riskRewardRatio,
    maxLossReais,
    maxGainReais,
  };
}

/**
 * Executa backtest histórico de sinais Long/Short no spread
 * Entrada: Z-Score cruza ±zEntry (ex: 1.5) | Saída: retorna a ±zExit (ex: 0.5)
 */
export function runBacktest(
  spreadData: { date: string; spread: number; zScore: number }[],
  zEntry = 1.5,
  zExit = 0.3
): BacktestResult {
  const trades: BacktestTrade[] = [];
  let inTrade = false;
  let direction: 'LONG' | 'SHORT' = 'LONG';
  let entryIdx = 0;

  for (let i = 0; i < spreadData.length; i++) {
    const z = spreadData[i].zScore;

    if (!inTrade) {
      if (z <= -zEntry) {
        inTrade = true;
        direction = 'LONG';
        entryIdx = i;
      } else if (z >= zEntry) {
        inTrade = true;
        direction = 'SHORT';
        entryIdx = i;
      }
    } else {
      const exitCondition =
        direction === 'LONG' ? z >= -zExit : z <= zExit;

      if (exitCondition || i === spreadData.length - 1) {
        const entry = spreadData[entryIdx];
        const exit = spreadData[i];
        const pnlPct = direction === 'LONG'
          ? parseFloat(((exit.spread - entry.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2))
          : parseFloat(((entry.spread - exit.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2));

        trades.push({
          entryDate: entry.date,
          exitDate: exit.date,
          entrySpread: entry.spread,
          exitSpread: exit.spread,
          entryZ: entry.zScore,
          exitZ: exit.zScore,
          direction,
          pnlPct,
          durationDays: i - entryIdx,
        });
        inTrade = false;
      }
    }
  }

  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return { trades: [], totalTrades: 0, winRate: 0, avgPnlPct: 0, totalPnlPct: 0, maxDrawdown: 0, avgDuration: 0 };
  }

  const winners = trades.filter(t => t.pnlPct > 0);
  const winRate = parseFloat(((winners.length / totalTrades) * 100).toFixed(1));
  const totalPnlPct = parseFloat(trades.reduce((s, t) => s + t.pnlPct, 0).toFixed(2));
  const avgPnlPct = parseFloat((totalPnlPct / totalTrades).toFixed(2));
  const avgDuration = parseFloat((trades.reduce((s, t) => s + t.durationDays, 0) / totalTrades).toFixed(1));

  // Max Drawdown
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    cumulative += t.pnlPct;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    trades,
    totalTrades,
    winRate,
    avgPnlPct,
    totalPnlPct: parseFloat(totalPnlPct.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    avgDuration,
  };
}

/**
 * Gera um relatório executivo em texto formatado para envio via WhatsApp, Telegram ou Clipboard
 */
export function generateOperationalReport(
  stock1Symbol: string,
  stock2Symbol: string,
  latestSpread: number,
  latestZScore: number,
  signal: string,
  stats: PairStats,
  resultadoCamadas: any,
  bandaFreqPercent: number
): string {
  const signalText =
    latestZScore <= -2.0 || signal === "LONG"
      ? "🟢 OPORTUNIDADE DE COMPRA DE SPREAD (Sobrevendido)"
      : latestZScore >= 2.0 || signal === "SHORT"
      ? "🔴 OPORTUNIDADE DE VENDA DE SPREAD (Sobrecomprado)"
      : "⚪ ZONA NEUTRA / EQUILÍBRIO GAUSSIANO";

  const lines: string[] = [
    `📊 *ESTUDO OPERACIONAL DE SPREAD & COINTEGRAÇÃO*`,
    `⚡ Par: *${stock1Symbol} vs ${stock2Symbol}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📈 *Spread Atual:* R$ ${latestSpread.toFixed(2)}`,
    `⚖️ *Z-Score (Desvio Padrão):* ${latestZScore >= 0 ? "+" : ""}${latestZScore.toFixed(2)} σ`,
    `🎯 *Sinal:* ${signalText}`,
    ``,
    `📌 *MÉTRICAS DO PAR (QUALIDADE):*`,
    `• Correlação: ${(stats.correlation * 100).toFixed(0)}% (R²: ${stats.rSquared})`,
    `• Beta do Par: ${stats.beta}`,
    `• Meia-Vida (Retorno à Média): ~${stats.halfLifeDays} períodos`,
    `• ATR do Spread: ${stats.atr}`,
    ``,
    `🔔 *FAIXA DE FREQUÊNCIA GAUSSIANA (${bandaFreqPercent}%):*`,
    `• Spread Mínimo (${bandaFreqPercent}%): R$ ${resultadoCamadas?.spreadMin?.toFixed(2) ?? "0.00"}`,
    `• Spread Máximo (${bandaFreqPercent}%): R$ ${resultadoCamadas?.spreadMax?.toFixed(2) ?? "0.00"}`,
    `• Pico de Frequência (Moda): R$ ${resultadoCamadas?.picoSpreadCenter?.toFixed(2) ?? "0.00"}`,
    ``,
    `⚙️ *MONTAGEM EM CAMADAS (GRID):*`,
  ];

  if (resultadoCamadas?.camadas && Array.isArray(resultadoCamadas.camadas)) {
    resultadoCamadas.camadas.forEach((c: any) => {
      const isAtual = c.index === resultadoCamadas.camadaAtualIndex ? " ◄ ATUAL" : "";
      lines.push(
        `  Camada #${c.index} (${c.rotulo}): Freq ${c.percent}% | Sugestão: ${c.sugestao}${isAtual}`
      );
    });
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Gerado via SpreadTrader — Análise Quantitativa B3`);

  return lines.join("\n");
}
