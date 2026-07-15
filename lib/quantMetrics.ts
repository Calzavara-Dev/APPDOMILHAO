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
  direction: 'LONG' | 'SHORT' | 'TROCA_A1' | 'TROCA_A2' | string;
  rotuloOperacao?: string; // Descrição textual clara (ex: "Vender PN / Comprar ON")
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
 * Calcula estatísticas quantitativas avançadas para trading de pares (Long & Short - Cointegração OLS)
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

  // 2. Pearson Correlation & Beta OLS (Regressão Linear S1 vs S2)
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

  // 3. Estatísticas do Spread Cointegrado
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

  // 5. Meia-Vida do Spread (Ornstein-Uhlenbeck / Regressão AR(1))
  // Modelo: (S_t - mu) = rho * (S_{t-1} - mu) + e_t
  let covAR1 = 0;
  let varAR1 = 0;
  for (let i = 1; i < n; i++) {
    const sCurr = spreadData[i].spread - meanSpread;
    const sPrev = spreadData[i - 1].spread - meanSpread;
    covAR1 += sCurr * sPrev;
    varAR1 += sPrev * sPrev;
  }
  let rho = varAR1 > 0 ? covAR1 / varAR1 : 0.85;
  if (rho >= 0.995) rho = 0.995;
  if (rho <= 0.05) rho = 0.05;

  const lambda = -Math.log(rho);
  const halfLifeDays = lambda > 0 ? Math.min(252, Math.max(1.0, Math.log(2) / lambda)) : 14.0;

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
 * Calcula Stop Loss, Take Profit e Sizing de Posição Beta-Neutro para o par
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

  // Stop: 1.5 ATR (ou 0.75 desvios) além do spread atual na direção contrária
  // Take Profit: retorno à média de equilíbrio da regressão (meanSpread)
  const atrBuffer = atr > 0 ? atr : stdDevSpread * 0.5;

  let stopLossSpread: number;
  let takeProfitSpread: number;

  if (latestZScore < 0) {
    // LONG spread: compra S1 e vende S2 -> stop se spread cair mais, TP na média
    stopLossSpread = parseFloat((latestSpread - atrBuffer * 1.5).toFixed(2));
    takeProfitSpread = parseFloat((meanSpread).toFixed(2));
  } else {
    // SHORT spread: vende S1 e compra S2 -> stop se spread subir mais, TP na média
    stopLossSpread = parseFloat((latestSpread + atrBuffer * 1.5).toFixed(2));
    takeProfitSpread = parseFloat((meanSpread).toFixed(2));
  }

  const riskSpread = Math.abs(latestSpread - stopLossSpread);
  const rewardSpread = Math.abs(latestSpread - takeProfitSpread);
  const riskRewardRatio = riskSpread > 0 ? parseFloat((rewardSpread / riskSpread).toFixed(2)) : 0;

  // Sizing Beta-Neutro Institucional:
  // Exposição na ponta comprada ~ Metade do Capital
  // Exposição na ponta vendida = Exposição da ponta 1 * Beta (para neutralizar o risco sistêmico de mercado)
  const halfCapital = capitalReais / 2;
  const qty1 = latestPrice1 > 0 ? Math.floor(halfCapital / latestPrice1) : 0;
  const qty2 = (latestPrice2 > 0 && beta > 0 && qty1 > 0)
    ? Math.floor((qty1 * latestPrice1 * beta) / latestPrice2)
    : 0;

  const maxLossReais = parseFloat((qty1 * riskSpread + qty2 * riskSpread * (1 / (beta || 1))).toFixed(2));
  const maxGainReais = parseFloat((qty1 * rewardSpread + qty2 * rewardSpread * (1 / (beta || 1))).toFixed(2));

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
 * Executa backtest histórico de sinais Long/Short no spread por Z-Score
 * Entrada: Z-Score cruza ±zEntry (ex: 1.5) | Saída: retorna a ±zExit (ex: 0.3)
 */
export function runBacktest(
  spreadData: { date: string; spread: number; zScore: number }[],
  zEntry = 1.5,
  zExit = 0.3,
  operationMode: 'custody_swap' | 'traditional_ls' = 'custody_swap',
  stock1Symbol = 'Ação 1',
  stock2Symbol = 'Ação 2'
): BacktestResult {
  const trades: BacktestTrade[] = [];
  let inTrade = false;
  let direction: 'LONG' | 'SHORT' | 'TROCA_A1' | 'TROCA_A2' = 'LONG';
  let entryIdx = 0;

  for (let i = 0; i < spreadData.length; i++) {
    const z = spreadData[i].zScore;

    if (!inTrade) {
      if (z <= -zEntry) {
        inTrade = true;
        direction = operationMode === 'custody_swap' ? 'TROCA_A1' : 'LONG';
        entryIdx = i;
      } else if (z >= zEntry) {
        inTrade = true;
        direction = operationMode === 'custody_swap' ? 'TROCA_A2' : 'SHORT';
        entryIdx = i;
      }
    } else {
      const exitCondition =
        (direction === 'LONG' || direction === 'TROCA_A1') ? z >= -zExit : z <= zExit;

      if (exitCondition || i === spreadData.length - 1) {
        const entry = spreadData[entryIdx];
        const exit = spreadData[i];
        const isBuySide = direction === 'LONG' || direction === 'TROCA_A1';
        const pnlPct = isBuySide
          ? parseFloat(((exit.spread - entry.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2))
          : parseFloat(((entry.spread - exit.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2));

        let rotuloOperacao = isBuySide ? `🟢 LONG ${stock1Symbol}` : `🔴 SHORT ${stock1Symbol}`;
        if (operationMode === 'custody_swap') {
          rotuloOperacao = isBuySide
            ? `🔄 Troca de Custódia: Vende ${stock2Symbol} → Compra ${stock1Symbol}`
            : `🔄 Troca de Custódia: Vende ${stock1Symbol} → Compra ${stock2Symbol}`;
        }

        trades.push({
          entryDate: entry.date,
          exitDate: exit.date,
          entrySpread: entry.spread,
          exitSpread: exit.spread,
          entryZ: entry.zScore,
          exitZ: exit.zScore,
          direction,
          rotuloOperacao,
          pnlPct,
          durationDays: i - entryIdx,
        });
        inTrade = false;
      }
    }
  }

  return calculateBacktestSummary(trades);
}

/**
 * Executa backtest sincronizado com as Camadas de Frequência Gaussiana configuradas pelo usuário
 * Entrada: Spread cruza abaixo do Spread Mínimo (70%/80%) ou acima do Spread Máximo
 * Saída: Spread retorna à Moda / Pico Central de Equilíbrio
 */
export function runLayerBacktest(
  spreadData: { date: string; spread: number; zScore: number }[],
  spreadMin: number,
  spreadMax: number,
  picoCenter: number,
  operationMode: 'custody_swap' | 'traditional_ls' = 'custody_swap',
  stock1Symbol = 'Ação 1',
  stock2Symbol = 'Ação 2'
): BacktestResult {
  const trades: BacktestTrade[] = [];
  let inTrade = false;
  let direction: 'LONG' | 'SHORT' | 'TROCA_A1' | 'TROCA_A2' = 'LONG';
  let entryIdx = 0;

  for (let i = 0; i < spreadData.length; i++) {
    const s = spreadData[i].spread;

    if (!inTrade) {
      if (s <= spreadMin) {
        inTrade = true;
        direction = operationMode === 'custody_swap' ? 'TROCA_A1' : 'LONG';
        entryIdx = i;
      } else if (s >= spreadMax) {
        inTrade = true;
        direction = operationMode === 'custody_swap' ? 'TROCA_A2' : 'SHORT';
        entryIdx = i;
      }
    } else {
      const isBuySide = direction === 'LONG' || direction === 'TROCA_A1';
      const exitCondition = isBuySide ? s >= picoCenter : s <= picoCenter;

      if (exitCondition || i === spreadData.length - 1) {
        const entry = spreadData[entryIdx];
        const exit = spreadData[i];
        const pnlPct = isBuySide
          ? parseFloat(((exit.spread - entry.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2))
          : parseFloat(((entry.spread - exit.spread) / Math.abs(entry.spread || 1) * 100).toFixed(2));

        let rotuloOperacao = isBuySide ? `🟢 LONG ${stock1Symbol}` : `🔴 SHORT ${stock1Symbol}`;
        if (operationMode === 'custody_swap') {
          rotuloOperacao = isBuySide
            ? `🔄 Troca em Camada (Extremo Inferior): Vende ${stock2Symbol} → Compra ${stock1Symbol}`
            : `🔄 Troca em Camada (Extremo Superior): Vende ${stock1Symbol} → Compra ${stock2Symbol}`;
        }

        trades.push({
          entryDate: entry.date,
          exitDate: exit.date,
          entrySpread: entry.spread,
          exitSpread: exit.spread,
          entryZ: entry.zScore,
          exitZ: exit.zScore,
          direction,
          rotuloOperacao,
          pnlPct,
          durationDays: i - entryIdx,
        });
        inTrade = false;
      }
    }
  }

  return calculateBacktestSummary(trades);
}

function calculateBacktestSummary(trades: BacktestTrade[]): BacktestResult {
  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return { trades: [], totalTrades: 0, winRate: 0, avgPnlPct: 0, totalPnlPct: 0, maxDrawdown: 0, avgDuration: 0 };
  }

  const winners = trades.filter(t => t.pnlPct > 0);
  const winRate = parseFloat(((winners.length / totalTrades) * 100).toFixed(1));
  const totalPnlPct = parseFloat(trades.reduce((s, t) => s + t.pnlPct, 0).toFixed(2));
  const avgPnlPct = parseFloat((totalPnlPct / totalTrades).toFixed(2));
  const avgDuration = parseFloat((trades.reduce((s, t) => s + t.durationDays, 0) / totalTrades).toFixed(1));

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
  bandaFreqPercent: number,
  operationMode: 'custody_swap' | 'traditional_ls' = 'custody_swap'
): string {
  let signalText =
    latestZScore <= -2.0 || signal === "LONG"
      ? "🟢 OPORTUNIDADE DE COMPRA DE SPREAD (Sobrevendido)"
      : latestZScore >= 2.0 || signal === "SHORT"
      ? "🔴 OPORTUNIDADE DE VENDA DE SPREAD (Sobrecomprado)"
      : "⚪ ZONA NEUTRA / EQUILÍBRIO GAUSSIANO";

  if (operationMode === "custody_swap") {
    if (latestZScore <= -1.5 || signal === "LONG") {
      signalText = `🟢 TROCA EM CUSTÓDIA: Vender ${stock2Symbol} da carteira → Comprar ${stock1Symbol}`;
    } else if (latestZScore >= 1.5 || signal === "SHORT") {
      signalText = `🔴 TROCA EM CUSTÓDIA: Vender ${stock1Symbol} da carteira → Comprar ${stock2Symbol}`;
    } else {
      signalText = `⚪ ZONA DE EQUILÍBRIO (Sem Troca / Reversão à Média)`;
    }
  }

  const lines: string[] = [
    `📊 *ESTUDO OPERACIONAL DE SPREAD & COINTEGRAÇÃO*`,
    `⚡ Par: *${stock1Symbol} vs ${stock2Symbol}* (${operationMode === 'custody_swap' ? 'Modo Troca de Custódia - Sem Short' : 'L&S Tradicional'})`,
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
      let sugestao = c.sugestao;
      if (operationMode === "custody_swap") {
        if (sugestao.includes("Ação 1")) sugestao = `🟢 Trocar para ${stock1Symbol} (Vender ${stock2Symbol})`;
        else if (sugestao.includes("Ação 2")) sugestao = `🔴 Trocar para ${stock2Symbol} (Vender ${stock1Symbol})`;
      }
      lines.push(
        `  Camada #${c.index} (${c.rotulo}): Freq ${c.percent}% | Sugestão: ${sugestao}${isAtual}`
      );
    });
  }

  if (operationMode === "custody_swap") {
    lines.push(``);
    lines.push(`💡 *Nota Operacional (Troca de Custódia):* Operação sem stop loss direcional e sem ponta vendida/aluguel. A estratégia consiste em acumular nas camadas extremas aguardando a reversão gaussiana para o pico central de frequência.`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Gerado via SpreadTrader — Análise Quantitativa B3`);

  return lines.join("\n");
}
