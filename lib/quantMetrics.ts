export interface PairStats {
  correlation: number; // Correlação de Pearson (-1 a +1)
  rSquared: number;    // R² (0 a 1)
  beta: number;        // Coeficiente Beta (Regressão Linear S1 em relação a S2)
  halfLifeDays: number; // Meia-vida estimada (em períodos/dias) para reversão à média
  meanSpread: number;  // Média do Spread no período
  stdDevSpread: number; // Desvio Padrão do Spread
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

  // 4. Meia-Vida do Spread (Ornstein-Uhlenbeck / Autocorrelação AR1)
  // rho = Cov(S_t, S_{t-1}) / Var(S)
  let covAR1 = 0;
  let varAR1 = 0;
  for (let i = 1; i < n; i++) {
    const sCurr = spreadData[i].spread - meanSpread;
    const sPrev = spreadData[i - 1].spread - meanSpread;
    covAR1 += sCurr * sPrev;
    varAR1 += sPrev * sPrev;
  }
  let rho = varAR1 > 0 ? covAR1 / varAR1 : 0.85;
  // Limitar rho para evitar divisão por zero em ln(rho)
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
