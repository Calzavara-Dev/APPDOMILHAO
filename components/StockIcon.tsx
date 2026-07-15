"use client";

import React, { useState, useEffect } from "react";

interface StockIconProps {
  symbol: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function StockIcon({ symbol, logoUrl, size = "md", className = "" }: StockIconProps) {
  const [imgErrorStep, setImgErrorStep] = useState<number>(0);

  // Redefinir tentativa se o símbolo mudar
  useEffect(() => {
    setImgErrorStep(0);
  }, [symbol, logoUrl]);

  const sizeClasses = {
    xs: "w-4 h-4 text-[8px]",
    sm: "w-5 h-5 text-[9px]",
    md: "w-7 h-7 text-[11px]",
    lg: "w-10 h-10 text-xs",
    xl: "w-12 h-12 text-sm",
  };

  const cleanSymbol = symbol.toUpperCase().trim();
  const baseSymbol = cleanSymbol.replace(/[0-9]+/g, ""); // ex: PETR de PETR4

  // Lista de URLs para tentar na ordem:
  // 1. URL retornado direto pela API brapi.dev (logoUrl)
  // 2. Repositório de ícones da B3 (Fintz) em maiúsculo
  // 3. Repositório de ícones da B3 (Fintz) por base do ticker (ex: PETR.png se PETR4 não tiver)
  const candidateUrls: string[] = [];
  if (logoUrl) candidateUrls.push(logoUrl);
  candidateUrls.push(`https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${cleanSymbol}.png`);
  if (baseSymbol && baseSymbol !== cleanSymbol) {
    candidateUrls.push(`https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${baseSymbol}.png`);
  }
  candidateUrls.push(`https://icons.bitfinex.com/0/${cleanSymbol}.png`);

  const currentUrl = candidateUrls[imgErrorStep];

  // Se já tentou todas as URLs e falhou, mostra fallback visual com as letras
  if (imgErrorStep >= candidateUrls.length || !currentUrl) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-cyan-500/20 via-slate-800 to-violet-500/20 border border-white/20 flex items-center justify-center font-mono font-extrabold text-slate-200 shrink-0 select-none shadow-sm ${sizeClasses[size]} ${className}`}
        title={`${cleanSymbol}`}
      >
        {cleanSymbol.slice(0, 4)}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center border border-white/15 p-0.5 ${sizeClasses[size]} ${className}`}>
      <img
        src={currentUrl}
        alt={cleanSymbol}
        className="w-full h-full object-contain rounded-full"
        onError={() => setImgErrorStep(prev => prev + 1)}
      />
    </div>
  );
}
