"use client";

import React, { useState } from "react";
import { HelpCircle, Sparkles, TrendingUp, TrendingDown, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { StockIcon } from "@/components/StockIcon";

interface ZScoreThermometerProps {
  zScore: number;
  stock1Symbol: string;
  stock2Symbol: string;
  halfLifeDays: number;
  spreadValue: number;
  logoUrl1?: string;
  logoUrl2?: string;
  operationMode?: 'custody_swap' | 'traditional_ls';
}

export function ZScoreThermometer({
  zScore,
  stock1Symbol,
  stock2Symbol,
  halfLifeDays,
  spreadValue,
  logoUrl1,
  logoUrl2,
  operationMode = 'custody_swap',
}: ZScoreThermometerProps) {
  const [showGuide, setShowGuide] = useState(false);

  // Mapeia zScore de [-3, +3] para porcentagem [0%, 100%]
  const clampedZ = Math.max(-3, Math.min(3, zScore));
  const pointerPercent = ((clampedZ + 3) / 6) * 100;

  // Nível de esticamento (0% a 100%) baseado no valor absoluto do Z-Score
  const stretchPct = Math.min(100, Math.round((Math.abs(zScore) / 2.5) * 100));

  // Determina status em português simples
  const isBuy = zScore <= -1.5;
  const isSell = zScore >= 1.5;

  return (
    <div className="mb-8 p-6 rounded-3xl glass border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-slate-900/40 to-violet-500/10 shadow-xl">
      {/* Topo do Termômetro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Termômetro Didático do Spread {operationMode === 'custody_swap' && '• Modo Troca de Custódia (Sem Short)'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex -space-x-1.5">
              <StockIcon symbol={stock1Symbol} logoUrl={logoUrl1} size="md" className="border-cyan-500/40" />
              <StockIcon symbol={stock2Symbol} logoUrl={logoUrl2} size="md" className="border-violet-500/40" />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Interpretação: {stock1Symbol} vs {stock2Symbol}
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>{showGuide ? "Ocultar explicação simples" : "O que é Z-Score?"}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Guia Rápido Expansível */}
      {showGuide && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 space-y-2 animate-fade-in">
          <p className="font-bold text-cyan-300">
            💡 Em poucas palavras: O Z-Score é como o &quot;Elástico&quot; entre as duas ações.
          </p>
          <p>
            • Quando o Z-Score está perto de <strong>0</strong>, as duas ações estão andando na proporção normal.
          </p>
          <p>
            • Quando passa de <strong>-1.5</strong> ou <strong>+1.5</strong>, o elástico esticou demais: significa que uma ação ficou barata demais ou cara demais em relação à outra e a probabilidade estatística de retornarem à média é muito alta!
          </p>
          {operationMode === 'custody_swap' && (
            <p className="text-emerald-300 border-t border-white/10 pt-2 mt-2">
              • <strong>Troca de Custódia:</strong> Você não faz venda a descoberto (short) nem paga aluguel BTC. Apenas vende a ação que valorizou em custódia e compra a que ficou descontada, acumulando nas camadas até reverter para a média.
            </p>
          )}
        </div>
      )}

      {/* Barra do Termômetro Visual (-3σ a +3σ) */}
      <div className="relative pt-8 pb-3">
        {/* Marcador Flutuante do Z-Score atual */}
        <div
          className="absolute top-0 transition-all duration-500 transform -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${pointerPercent}%` }}
        >
          <div
            className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-lg border ${
              isBuy
                ? "bg-emerald-500 text-slate-950 border-emerald-300"
                : isSell
                ? "bg-rose-500 text-white border-rose-300"
                : "bg-cyan-500 text-slate-950 border-cyan-300"
            }`}
          >
            AGORA: {zScore >= 0 ? "+" : ""}
            {zScore.toFixed(2)} σ
          </div>
          <div
            className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${
              isBuy
                ? "border-t-emerald-500"
                : isSell
                ? "border-t-rose-500"
                : "border-t-cyan-500"
            }`}
          />
        </div>

        {/* Faixa Colorida do Termômetro */}
        <div className="h-7 w-full rounded-full overflow-hidden flex shadow-inner border border-white/10">
          {/* Zona Verde - Compra (-3 a -1.5) -> 25% da barra */}
          <div className="w-1/4 bg-gradient-to-r from-emerald-600 to-emerald-500/60 flex items-center justify-center">
            <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter drop-shadow truncate px-1">
              🟢 <span className="hidden sm:inline">{operationMode === 'custody_swap' ? `Trocar p/ ${stock1Symbol}` : 'Comprar'}</span><span className="sm:hidden">{operationMode === 'custody_swap' ? 'Troca 1' : 'Comp.'}</span>
            </span>
          </div>
          {/* Zona Neutra (-1.5 a +1.5) -> 50% da barra */}
          <div className="w-2/4 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center border-x border-white/20">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-tighter truncate px-1">
              ⚪ <span className="hidden sm:inline">Normal / Equilíbrio (Média)</span><span className="sm:hidden">Equilíbrio</span>
            </span>
          </div>
          {/* Zona Vermelha - Venda (+1.5 a +3) -> 25% da barra */}
          <div className="w-1/4 bg-gradient-to-r from-rose-500/60 to-rose-600 flex items-center justify-center">
            <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter drop-shadow truncate px-1">
              🔴 <span className="hidden sm:inline">{operationMode === 'custody_swap' ? `Trocar p/ ${stock2Symbol}` : 'Vender'}</span><span className="sm:hidden">{operationMode === 'custody_swap' ? 'Troca 2' : 'Vend.'}</span>
            </span>
          </div>
        </div>

        {/* Escala Numérica abaixo da barra */}
        <div className="flex justify-between text-[9px] sm:text-[11px] font-mono font-bold text-slate-400 mt-2 px-0.5 sm:px-1">
          <span>-3.0 σ<span className="hidden sm:inline"> (Extremo)</span></span>
          <span className="text-emerald-400">-1.5 σ<span className="hidden sm:inline"> ({operationMode === 'custody_swap' ? `Vende ${stock2Symbol} / Compra ${stock1Symbol}` : 'Entrada Long'})</span></span>
          <span className="text-white">0<span className="hidden sm:inline"> (Média)</span></span>
          <span className="text-rose-400">+1.5 σ<span className="hidden sm:inline"> ({operationMode === 'custody_swap' ? `Vende ${stock1Symbol} / Compra ${stock2Symbol}` : 'Entrada Short'})</span></span>
          <span>+3.0 σ<span className="hidden sm:inline"> (Extremo)</span></span>
        </div>
      </div>

      {/* Caixa de Tradução em Português Simples */}
      <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
            {isBuy ? (
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            ) : isSell ? (
              <TrendingDown className="w-6 h-6 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-cyan-400" />
            )}
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              O que fazer na prática? (Tradução Simples)
            </span>
            <p className="text-sm font-semibold text-slate-100">
              {isBuy ? (
                operationMode === 'custody_swap' ? (
                  <>
                    <strong className="text-emerald-400">{stock1Symbol}</strong> ficou descontada em relação a <strong className="text-violet-400">{stock2Symbol}</strong> (esticamento de <strong>{stretchPct}%</strong>).
                    No modo Troca de Custódia: <span className="text-emerald-400 font-bold underline">venda {stock2Symbol} que está em custódia e compre {stock1Symbol}</span> sem ficar ponta vendida, aguardando a reversão à média em ~<strong>{halfLifeDays} dias</strong>.
                  </>
                ) : (
                  <>
                    O preço de <strong className="text-emerald-400">{stock1Symbol}</strong> caiu bastante em relação a{" "}
                    <strong>{stock2Symbol}</strong> (esticamento de <strong>{stretchPct}%</strong>). É oportunidade de{" "}
                    <span className="text-emerald-400 underline">comprar o spread</span> com expectativa de retorno em{" "}
                    <strong>~{halfLifeDays} dias</strong>.
                  </>
                )
              ) : isSell ? (
                operationMode === 'custody_swap' ? (
                  <>
                    <strong className="text-rose-400">{stock1Symbol}</strong> valorizou muito acima do normal contra <strong className="text-violet-400">{stock2Symbol}</strong> (esticamento de <strong>{stretchPct}%</strong>).
                    No modo Troca de Custódia: <span className="text-rose-400 font-bold underline">venda {stock1Symbol} da sua custódia e compre {stock2Symbol}</span>, sem aluguel ou short, aguardando o retorno à média em ~<strong>{halfLifeDays} dias</strong>.
                  </>
                ) : (
                  <>
                    O preço de <strong className="text-rose-400">{stock1Symbol}</strong> subiu muito acima do normal em relação a{" "}
                    <strong>{stock2Symbol}</strong> (esticamento de <strong>{stretchPct}%</strong>). É oportunidade de{" "}
                    <span className="text-rose-400 underline">vender o spread</span> até que a diferença retorne à média.
                  </>
                )
              ) : (
                <>
                  O par <strong className="text-cyan-300">{stock1Symbol} x {stock2Symbol}</strong> está caminhando dentro da sua{" "}
                  <strong>faixa normal de equilíbrio</strong>. Não há distorção estatística suficiente para trocar de custódia ou abrir nova operação agora.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Indicador de Esticamento */}
        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/10 w-full md:w-auto shrink-0">
          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Nível de Esticamento</span>
            <span className="text-base font-black font-mono text-white">{stretchPct}%</span>
          </div>
          <div className="w-24 md:w-14 bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                stretchPct >= 60 ? (isBuy ? "bg-emerald-400" : "bg-rose-400") : "bg-cyan-400"
              }`}
              style={{ width: `${stretchPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
