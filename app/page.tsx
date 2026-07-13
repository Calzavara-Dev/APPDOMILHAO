"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import APP_CONFIG from "@/config/app-config";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ComposedChart, Area
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings, TrendingUp, TrendingDown, Activity,
  BarChart2, Clock, Layers, Eye, EyeOff,
  ChevronRight, Zap, Target, Radio,
  Share2, Check, Compass, Award,
  Bell, BellOff, Sun, Moon, Calculator, FlaskConical,
  ListChecks, BookOpen, Search, Trash2, History
} from "lucide-react";
import {
  calculatePairStats, generateOperationalReport, type PairStats,
  calculateStopLossTakeProfit, runBacktest, type StopLossResult, type BacktestResult
} from "@/lib/quantMetrics";
import { saveSignal, loadSignals, clearSignals, type SignalRecord } from "@/lib/signalHistory";
import {
  getNotifPermission, requestPermission, checkAndNotify, type NotifPermission
} from "@/lib/pushNotification";
import { ZScoreThermometer } from "@/components/ZScoreThermometer";


// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type StockData = { date: string; price: number };
type SpreadData = { date: string; spread: number; zScore: number };
type HistogramData = { bin: number; frequency: number; normal: number };
type DistributionStats = {
  withinHalfSigma: { count: number; avgPrice1: number; avgPrice2: number };
  withinOneSigma: { count: number; avgPrice1: number; avgPrice2: number };
  withinTwoSigma: { count: number; avgPrice1: number; avgPrice2: number };
  beyondTwoSigma: { count: number; avgPrice1: number; avgPrice2: number };
  total: number;
};
type TopSpread = { spread: number; frequency: number };

// ─────────────────────────────────────────
// MOCK DATA GENERATORS
// ─────────────────────────────────────────
const generateStockData = (symbol: string, days = 30): StockData[] => {
  const data: StockData[] = [];
  let price = 50 + Math.random() * 50;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (1 + (Math.random() - 0.5) * 0.05);
    data.push({ date: date.toISOString().split('T')[0], price: parseFloat(price.toFixed(2)) });
  }
  return data;
};

const generateSpreadData = (stock1: StockData[], stock2: StockData[]): SpreadData[] => {
  const data: SpreadData[] = [];
  const minLength = Math.min(stock1.length, stock2.length);
  for (let i = 0; i < minLength; i++) {
    data.push({ date: stock1[i].date, spread: parseFloat((stock1[i].price - stock2[i].price).toFixed(2)), zScore: 0 });
  }
  const spreads = data.map(d => d.spread);
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const stdDev = Math.sqrt(spreads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / spreads.length);
  return data.map(d => ({ ...d, zScore: parseFloat(((d.spread - mean) / stdDev).toFixed(2)) }));
};

const generateHistogramData = (spreadData: SpreadData[], binCount = 20): HistogramData[] => {
  const spreads = spreadData.map(d => d.spread);
  const min = Math.min(...spreads);
  const max = Math.max(...spreads);
  const binWidth = (max - min) / binCount;
  const bins: { [key: number]: number } = {};
  for (let i = 0; i < binCount; i++) bins[i] = 0;
  spreads.forEach(spread => { const idx = Math.min(Math.floor((spread - min) / binWidth), binCount - 1); bins[idx]++; });
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const stdDev = Math.sqrt(spreads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / spreads.length);
  const histogramData: HistogramData[] = [];
  for (let i = 0; i < binCount; i++) {
    const binCenter = min + (i + 0.5) * binWidth;
    const normal = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((binCenter - mean) / stdDev, 2));
    histogramData.push({ bin: parseFloat(binCenter.toFixed(2)), frequency: bins[i], normal: parseFloat((normal * spreads.length * binWidth).toFixed(2)) });
  }
  return histogramData;
};

const calculateDistributionStats = (spreadData: SpreadData[], stock1Data: StockData[], stock2Data: StockData[]): DistributionStats => {
  const spreads = spreadData.map(d => d.spread);
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const stdDev = Math.sqrt(spreads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / spreads.length);
  const gaussianWeight = (x: number) => {
    if (stdDev === 0) return 0;
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
  };
  let wHS = 0, wOS = 0, wTS = 0, wBS = 0;
  let p1HS = 0, p2HS = 0, p1OS = 0, p2OS = 0, p1TS = 0, p2TS = 0, p1BS = 0, p2BS = 0;
  for (let i = 0; i < spreadData.length; i++) {
    const s = spreadData[i].spread, w = gaussianWeight(s), dist = Math.abs(s - mean);
    const p1 = stock1Data[i].price, p2 = stock2Data[i].price;
    if (dist <= 0.5 * stdDev) { wHS += w; p1HS += p1 * w; p2HS += p2 * w; }
    else if (dist <= stdDev) { wOS += w; p1OS += p1 * w; p2OS += p2 * w; }
    else if (dist <= 2 * stdDev) { wTS += w; p1TS += p1 * w; p2TS += p2 * w; }
    else { wBS += w; p1BS += p1 * w; p2BS += p2 * w; }
  }
  const fmt = (n: number) => parseFloat(n.toFixed(2));
  return {
    withinHalfSigma: { count: fmt(wHS), avgPrice1: wHS > 0 ? fmt(p1HS / wHS) : 0, avgPrice2: wHS > 0 ? fmt(p2HS / wHS) : 0 },
    withinOneSigma: { count: fmt(wOS + wHS), avgPrice1: wOS > 0 ? fmt(p1OS / wOS) : 0, avgPrice2: wOS > 0 ? fmt(p2OS / wOS) : 0 },
    withinTwoSigma: { count: fmt(wTS + wOS + wHS), avgPrice1: wTS > 0 ? fmt(p1TS / wTS) : 0, avgPrice2: wTS > 0 ? fmt(p2TS / wTS) : 0 },
    beyondTwoSigma: { count: fmt(wBS), avgPrice1: wBS > 0 ? fmt(p1BS / wBS) : 0, avgPrice2: wBS > 0 ? fmt(p2BS / wBS) : 0 },
    total: spreadData.length,
  };
};

const calculateTopSpreads = (spreadData: SpreadData[]): TopSpread[] => {
  if (spreadData.length === 0) return [];
  const spreads = spreadData.map(d => d.spread);
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const stdDev = Math.sqrt(spreads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / spreads.length);
  const weight = (x: number) => stdDev === 0 ? 0 : (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
  const groups: { [k: string]: number } = {};
  spreadData.forEach(d => { const k = parseFloat(d.spread.toFixed(2)).toString(); groups[k] = (groups[k] || 0) + weight(parseFloat(k)); });
  return Object.entries(groups).map(([spread, frequency]) => ({ spread: parseFloat(spread), frequency })).sort((a, b) => b.frequency - a.frequency).slice(0, 5);
};

// ─────────────────────────────────────────
// BRAZILIAN STOCKS
// ─────────────────────────────────────────
const BRAZILIAN_STOCKS = [
  { symbol: "PETR3", name: "Petrobras PN" }, { symbol: "PETR4", name: "Petrobras ON" },
  { symbol: "VALE3", name: "Vale PN" }, { symbol: "ITUB3", name: "Itaú PN" },
  { symbol: "ITUB4", name: "Itaú ON" }, { symbol: "BBDC3", name: "Bradesco PN" },
  { symbol: "BBDC4", name: "Bradesco ON" }, { symbol: "SANB3", name: "Santander PN" },
  { symbol: "SANB4", name: "Santander ON" }, { symbol: "BBAS3", name: "Banco do Brasil" },
  { symbol: "BPAC3", name: "BTGP Banespa PN" }, { symbol: "BPAC5", name: "BTGP Banespa PNA" },
  { symbol: "CSNA3", name: "CSN PN" }, { symbol: "USIM3", name: "Usiminas PN" },
  { symbol: "USIM5", name: "Usiminas PNA" }, { symbol: "GOAU3", name: "Metalúrgica Gerdau PN" },
  { symbol: "GOAU4", name: "Metalúrgica Gerdau ON" }, { symbol: "GGBR3", name: "Gerdau PN" },
  { symbol: "GGBR4", name: "Gerdau ON" }, { symbol: "KLBN3", name: "Klabin PN" },
  { symbol: "KLBN4", name: "Klabin ON" }, { symbol: "SUZB3", name: "Suzano PN" },
  { symbol: "ELET3", name: "Eletrobras PN" }, { symbol: "ELET6", name: "Eletrobras PNB" },
  { symbol: "CMIG3", name: "Cemig PN" }, { symbol: "CMIG4", name: "Cemig ON" },
  { symbol: "CPFE3", name: "CPFL Energia" }, { symbol: "RENT3", name: "Localiza" },
  { symbol: "VIVT3", name: "Telefônica Brasil" }, { symbol: "WEGE3", name: "WEG" },
  { symbol: "ABEV3", name: "Ambev" }, { symbol: "LREN3", name: "Lojas Renner" },
  { symbol: "MGLU3", name: "Magazine Luiza" }, { symbol: "RADL3", name: "Raia Drogasil" },
  { symbol: "PCAR3", name: "Pão de Açúcar" }, { symbol: "CIEL3", name: "Cielo" },
  { symbol: "JBSS3", name: "JBS" }, { symbol: "MRVE3", name: "MRV" },
  { symbol: "QUAL3", name: "Qualicorp" }, { symbol: "TIMS3", name: "TIM" },
];

// ─────────────────────────────────────────
// CUSTOM TOOLTIPS
// ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-xs border border-white/10 shadow-2xl">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
};

const DistributionTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-xs border border-white/10 shadow-2xl">
      <p className="font-semibold text-slate-300 mb-1">Spread: R$ {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name === 'frequency' ? `Frequência: ${entry.value}` : `Curva Normal: ${Number(entry.value).toFixed(2)}`}
        </p>
      ))}
    </div>
  );
};

export type CamadaSpread = {
  index: number;
  min: number;
  max: number;
  count: number;
  percent: number;
  avgPrice1: number;
  avgPrice2: number;
  rotulo: string;
  sugestao: string;
  zScoreCamada: number;
  potencialRetornoPct: number;
};

export type ResultadoBandasCamadas = {
  spreadMin: number;
  spreadMax: number;
  step: number;
  totalNoPeriodo: number;
  countNaFaixa: number;
  percentNaFaixa: number;
  picoCamadaIndex: number;
  picoSpreadCenter: number;
  picoCount: number;
  camadaAtualIndex: number | null;
  camadaAtualSugestao: string;
  camadas: CamadaSpread[];
};

const calculateBandasCamadas = (
  spreadData: SpreadData[],
  stock1Data: StockData[],
  stock2Data: StockData[],
  bandaPercent: number,
  numCamadas: number,
  customFaixa?: { enabled: boolean; min: number; max: number },
  latestSpreadValue?: number
): ResultadoBandasCamadas => {
  if (spreadData.length === 0) {
    return {
      spreadMin: 0,
      spreadMax: 0,
      step: 0,
      totalNoPeriodo: 0,
      countNaFaixa: 0,
      percentNaFaixa: 0,
      picoCamadaIndex: 1,
      picoSpreadCenter: 0,
      picoCount: 0,
      camadaAtualIndex: null,
      camadaAtualSugestao: "Aguardando dados...",
      camadas: [],
    };
  }

  const sorted = [...spreadData].sort((a, b) => a.spread - b.spread);
  let spreadMin = 0;
  let spreadMax = 0;

  if (customFaixa && customFaixa.enabled && customFaixa.max > customFaixa.min) {
    spreadMin = customFaixa.min;
    spreadMax = customFaixa.max;
  } else {
    const tailPct = Math.max(0, (100 - bandaPercent) / 200);
    const minIdx = Math.floor(sorted.length * tailPct);
    const maxIdx = Math.min(sorted.length - 1, Math.ceil(sorted.length * (1 - tailPct)));
    spreadMin = parseFloat(sorted[minIdx].spread.toFixed(2));
    spreadMax = parseFloat(sorted[maxIdx].spread.toFixed(2));
  }

  if (spreadMax <= spreadMin) {
    spreadMax = parseFloat((spreadMin + 1).toFixed(2));
  }

  const spreadsList = spreadData.map(d => d.spread);
  const meanSpread = spreadsList.reduce((a, b) => a + b, 0) / (spreadsList.length || 1);
  const stdDevSpread = Math.sqrt(
    spreadsList.map(x => Math.pow(x - meanSpread, 2)).reduce((a, b) => a + b, 0) / (spreadsList.length || 1)
  );

  const step = parseFloat(((spreadMax - spreadMin) / numCamadas).toFixed(2));
  const camadas: CamadaSpread[] = [];
  let countNaFaixa = 0;

  for (let i = 0; i < numCamadas; i++) {
    const cMin = parseFloat((spreadMin + i * step).toFixed(2));
    const cMax = parseFloat((i === numCamadas - 1 ? spreadMax : spreadMin + (i + 1) * step).toFixed(2));
    const cCenter = parseFloat(((cMin + cMax) / 2).toFixed(2));

    let matchingIndices: number[] = [];
    for (let idx = 0; idx < spreadData.length; idx++) {
      const s = spreadData[idx].spread;
      const inRange = i === numCamadas - 1 ? (s >= cMin && s <= cMax) : (s >= cMin && s < cMax);
      if (inRange) matchingIndices.push(idx);
    }

    countNaFaixa += matchingIndices.length;
    const count = matchingIndices.length;
    const percent = parseFloat(((count / spreadData.length) * 100).toFixed(1));

    let sum1 = 0;
    let sum2 = 0;
    matchingIndices.forEach(idx => {
      sum1 += stock1Data[idx]?.price || 0;
      sum2 += stock2Data[idx]?.price || 0;
    });

    const avgPrice1 = count > 0 ? parseFloat((sum1 / count).toFixed(2)) : 0;
    const avgPrice2 = count > 0 ? parseFloat((sum2 / count).toFixed(2)) : 0;

    const zScoreCamada = stdDevSpread > 0 ? parseFloat(((cCenter - meanSpread) / stdDevSpread).toFixed(2)) : 0;
    const potencialRetornoPct = cCenter > 0 ? parseFloat(((Math.abs(cCenter - meanSpread) / cCenter) * 100).toFixed(2)) : 0;

    let sugestao = "🟡 Spread Central / Equilíbrio";
    if (i < numCamadas / 3) {
      sugestao = "🟢 Spread Baixo — Compra Ação 1";
    } else if (i >= (numCamadas * 2) / 3) {
      sugestao = "🔴 Spread Alto — Compra Ação 2";
    }

    camadas.push({
      index: i + 1,
      min: cMin,
      max: cMax,
      count,
      percent,
      avgPrice1,
      avgPrice2,
      rotulo: `R$ ${cMin.toFixed(2)} — R$ ${cMax.toFixed(2)}`,
      sugestao,
      zScoreCamada,
      potencialRetornoPct,
    });
  }

  const percentNaFaixa = parseFloat(((countNaFaixa / spreadData.length) * 100).toFixed(1));

  // Achar o Pico (Moda da Curva Gaussiana nas camadas)
  let picoCamadaIndex = 1;
  let picoCount = 0;
  let picoSpreadCenter = (spreadMin + spreadMax) / 2;

  camadas.forEach(c => {
    if (c.count > picoCount) {
      picoCount = c.count;
      picoCamadaIndex = c.index;
      picoSpreadCenter = parseFloat(((c.min + c.max) / 2).toFixed(2));
    }
  });

  // Achar em qual camada o Spread Atual está
  let camadaAtualIndex: number | null = null;
  let camadaAtualSugestao = "Spread Fora da Faixa de Frequência";
  if (latestSpreadValue !== undefined) {
    const found = camadas.find(c => latestSpreadValue >= c.min && latestSpreadValue <= c.max);
    if (found) {
      camadaAtualIndex = found.index;
      camadaAtualSugestao = found.sugestao;
    } else if (latestSpreadValue < spreadMin) {
      camadaAtualSugestao = "🟢 Abaixo da Banda — Forte Oportunidade Ação 1";
    } else if (latestSpreadValue > spreadMax) {
      camadaAtualSugestao = "🔴 Acima da Banda — Forte Oportunidade Ação 2";
    }
  }

  return {
    spreadMin,
    spreadMax,
    step,
    totalNoPeriodo: spreadData.length,
    countNaFaixa,
    percentNaFaixa,
    picoCamadaIndex,
    picoSpreadCenter,
    picoCount,
    camadaAtualIndex,
    camadaAtualSugestao,
    camadas,
  };
};

// ─────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────
type TabKey = 'resumo' | 'camadas' | 'ocorrencias' | 'estatisticas' | 'ferramentas' | 'backtest' | 'watchlist' | 'historico' | 'configuracoes';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'resumo', label: 'Resumo', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'camadas', label: 'Bandas & Camadas', icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'backtest', label: 'Backtest', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: 'ferramentas', label: 'Calculadora', icon: <Calculator className="w-3.5 h-3.5" /> },
  { key: 'watchlist', label: 'Watchlist', icon: <Search className="w-3.5 h-3.5" /> },
  { key: 'historico', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
  { key: 'ocorrencias', label: 'Ocorrências', icon: <Target className="w-3.5 h-3.5" /> },
  { key: 'estatisticas', label: 'Estatísticas', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: 'configuracoes', label: 'Config', icon: <Settings className="w-3.5 h-3.5" /> },
];

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const LS_KEYS = { occPrefs: 'occurrence_prefs', zRanges: 'zscore_ranges_prefs' } as const;

function StockPairAnalyzer() {
  const [stock1Symbol, setStock1Symbol] = useState("PETR3");
  const [stock2Symbol, setStock2Symbol] = useState("PETR4");
  const [stock1Data, setStock1Data] = useState<StockData[]>([]);
  const [stock2Data, setStock2Data] = useState<StockData[]>([]);
  const [spreadData, setSpreadData] = useState<SpreadData[]>([]);
  const [occLimit, setOccLimit] = useState<number>(20);
  const [occSort, setOccSort] = useState<'recent' | 'spread_desc' | 'spread_asc'>('recent');
  const [showCols, setShowCols] = useState<{ a1: boolean; a2: boolean; spread: boolean; z: boolean }>({ a1: true, a2: true, spread: true, z: true });
  type RangeSignal = 'LONG' | 'SHORT' | 'NEUTRO' | 'IGNORAR';
  const [zRangeText, setZRangeText] = useState<string>('');
  const [zRanges, setZRanges] = useState<Array<{ min: number; max: number; signal: RangeSignal }>>([]);
  const [filterByRanges, setFilterByRanges] = useState<boolean>(false);
  const [rangeLines, setRangeLines] = useState<number[]>([]);
  const [histogramData, setHistogramData] = useState<HistogramData[]>([]);
  const [distributionStats, setDistributionStats] = useState<DistributionStats>({
    withinHalfSigma: { count: 0, avgPrice1: 0, avgPrice2: 0 },
    withinOneSigma: { count: 0, avgPrice1: 0, avgPrice2: 0 },
    withinTwoSigma: { count: 0, avgPrice1: 0, avgPrice2: 0 },
    beyondTwoSigma: { count: 0, avgPrice1: 0, avgPrice2: 0 },
    total: 0
  });
  const [topSpreads, setTopSpreads] = useState<TopSpread[]>([]);
  const [latestSpread, setLatestSpread] = useState(0);
  const [latestZScore, setLatestZScore] = useState(0);
  const [signal, setSignal] = useState<"LONG" | "SHORT" | "NEUTRAL">("NEUTRAL");
  const [relevanceBand, setRelevanceBand] = useState<'68' | '95' | '99' | 'all'>('all');
  const [dataSource, setDataSource] = useState<"real" | "simulado">("simulado");
  const [histBins, setHistBins] = useState(20);
  const [bandaFreqPercent, setBandaFreqPercent] = useState<number>(70);
  const [numCamadas, setNumCamadas] = useState<number>(5);
  const [faixaPersonalizada, setFaixaPersonalizada] = useState<boolean>(false);
  const [customSpreadMin, setCustomSpreadMin] = useState<number>(1.0);
  const [customSpreadMax, setCustomSpreadMax] = useState<number>(5.0);
  const [resultadoCamadas, setResultadoCamadas] = useState<ResultadoBandasCamadas | null>(null);
  const cacheRef = useRef<Record<string, { ts: number; data: StockData[] }>>({});
  const [updateInterval, setUpdateInterval] = useState(APP_CONFIG.TIMING.UPDATE_INTERVALS.HOURLY);
  const [historyDays, setHistoryDays] = useState(APP_CONFIG.TRADING.HISTORICAL_PERIOD.DAYS);
  const [brapiToken, setBrapiToken] = useState<string>(APP_CONFIG.API.BRAPI.TOKEN || '');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [livePrice1, setLivePrice1] = useState<number | null>(null);
  const [livePrice2, setLivePrice2] = useState<number | null>(null);
  const [liveChange1, setLiveChange1] = useState<number | null>(null);
  const [liveChange2, setLiveChange2] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('resumo');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // ── Dark / Light Mode ──
  const [isDark, setIsDark] = useState<boolean>(true);

  // ── Push Notifications ──
  const [notifPermission, setNotifPermission] = useState<NotifPermission>('default');

  // ── Histórico de Sinais ──
  const [signalHistory, setSignalHistory] = useState<SignalRecord[]>([]);

  // ── Calculadora de Sizing / Stop Loss ──
  const [capitalReais, setCapitalReais] = useState<number>(10000);
  const [stopLossResult, setStopLossResult] = useState<StopLossResult | null>(null);

  // ── Backtest ──
  const [backtestZEntry, setBacktestZEntry] = useState<number>(1.5);
  const [backtestZExit, setBacktestZExit] = useState<number>(0.3);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  // ── Watchlist ──
  const WATCHLIST_PAIRS: [string, string][] = [
    ['PETR3', 'PETR4'],
    ['VALE3', 'PETR4'],
    ['ITUB4', 'BBDC4'],
    ['ABEV3', 'BRFS3'],
    ['WEGE3', 'EGIE3'],
    ['MGLU3', 'VIIA3'],
  ];


  const pairStats: PairStats = useMemo(() => {
    return calculatePairStats(stock1Data, stock2Data, spreadData);
  }, [stock1Data, stock2Data, spreadData]);

  const handleCopyReport = () => {
    const reportText = generateOperationalReport(
      stock1Symbol,
      stock2Symbol,
      latestSpread,
      latestZScore,
      signal,
      pairStats,
      resultadoCamadas,
      bandaFreqPercent
    );
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // ── Dark / Light Mode ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try { localStorage.setItem('spreadtrader_theme', isDark ? 'dark' : 'light'); } catch { }
  }, [isDark]);

  // ── Notificações: carregar permissão ao montar ──
  useEffect(() => {
    setNotifPermission(getNotifPermission());
  }, []);

  // ── Histórico de sinais: carregar ao montar ──
  useEffect(() => {
    setSignalHistory(loadSignals());
  }, []);

  // ── Auto-salvar sinal quando signal muda (não NEUTRAL) ──
  useEffect(() => {
    if (signal !== 'NEUTRAL' && latestSpread !== 0) {
      saveSignal({
        pair: `${stock1Symbol}/${stock2Symbol}`,
        signal,
        spread: latestSpread,
        zScore: latestZScore,
        camadaSugestao: resultadoCamadas?.camadaAtualSugestao,
      });
      setSignalHistory(loadSignals());
      // Verifica notificação
      checkAndNotify(`${stock1Symbol}/${stock2Symbol}`, latestZScore, 1.5);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, stock1Symbol, stock2Symbol]);

  // ── Calculadora Stop Loss / Sizing ──
  const handleCalculateSizing = useCallback(() => {
    const p1 = livePrice1 ?? (stock1Data.length ? stock1Data[stock1Data.length - 1].price : 0);
    const p2 = livePrice2 ?? (stock2Data.length ? stock2Data[stock2Data.length - 1].price : 0);
    const result = calculateStopLossTakeProfit(
      latestSpread, latestZScore, pairStats, p1, p2, capitalReais
    );
    setStopLossResult(result);
  }, [latestSpread, latestZScore, pairStats, livePrice1, livePrice2, stock1Data, stock2Data, capitalReais]);

  // ── Recalcular automaticamente quando dados mudam ──
  useEffect(() => {
    if (spreadData.length > 0) {
      handleCalculateSizing();
    }
  }, [spreadData, handleCalculateSizing]);

  // ── Backtest ──
  const handleRunBacktest = useCallback(() => {
    if (spreadData.length < 5) return;
    const result = runBacktest(spreadData, backtestZEntry, backtestZExit);
    setBacktestResult(result);
  }, [spreadData, backtestZEntry, backtestZExit]);

  useEffect(() => {
    if (spreadData.length > 0) handleRunBacktest();
  }, [spreadData, handleRunBacktest]);

  useEffect(() => { try { localStorage.setItem('ui_active_tab', activeTab); } catch { } }, [activeTab]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('spreadtrader_theme');
      if (savedTheme) setIsDark(savedTheme === 'dark');
      const occ = localStorage.getItem(LS_KEYS.occPrefs);
      if (occ) { const p = JSON.parse(occ); if (p.limit) setOccLimit(p.limit); if (p.sort) setOccSort(p.sort); if (p.columns) setShowCols(p.columns); }
      const zr = localStorage.getItem(LS_KEYS.zRanges);
      if (zr) { const p = JSON.parse(zr); if (Array.isArray(p.ranges)) setZRanges(p.ranges); if (typeof p.filter === 'boolean') setFilterByRanges(p.filter); if (typeof p.text === 'string') setZRangeText(p.text); }
      const savedToken = localStorage.getItem('brapi_token');
      if (savedToken) setBrapiToken(savedToken);
      const savedTab = localStorage.getItem('ui_active_tab');
      if (savedTab && TABS.map(t => t.key).includes(savedTab as TabKey)) setActiveTab(savedTab as TabKey);
    } catch { }
  }, []);



  useEffect(() => { try { localStorage.setItem(LS_KEYS.occPrefs, JSON.stringify({ limit: occLimit, sort: occSort, columns: showCols })); } catch { } }, [occLimit, occSort, showCols]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.zRanges, JSON.stringify({ ranges: zRanges, filter: filterByRanges, text: zRangeText })); } catch { } }, [zRanges, filterByRanges, zRangeText]);

  useEffect(() => { try { localStorage.setItem('brapi_token', brapiToken); } catch { } }, [brapiToken]);

  useEffect(() => {
    // ─── brapi.dev — API oficial para ações brasileiras (B3) ───
    // Free plan: sem token, dados com delay ~30min, histórico 3 meses
    // Com token:  todos os ativos, histórico estendido, 15.000 req/mês grátis
    // Sem token:  PETR4, VALE3, MGLU3, ITUB4 têm acesso irrestrito gratuito
    const fetchBrapi = async (symbol: string): Promise<StockData[] | null> => {
      try {
        const cacheKey = `brapi:${symbol}:${historyDays}:${brapiToken}`;
        const now = Date.now();
        const cacheTTL = 30 * 60 * 1000; // 30 min cache (free plan refresh)
        const cached = cacheRef.current[cacheKey];
        if (cached && now - cached.ts < cacheTTL) return cached.data;

        // Mapear período histórico para range da brapi (limite de 3mo da API)
        const getRange = (days: number) => {
          if (days <= 22) return '1mo';
          return '3mo';
        };

        const url = `https://brapi.dev/api/quote/${symbol}?range=${getRange(historyDays)}&interval=1d&fundamental=false${
          brapiToken ? `&token=${brapiToken}` : ''
        }`;

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        const result = json?.results?.[0];
        if (!result?.historicalDataPrice?.length) return null;

        const data: StockData[] = result.historicalDataPrice
          .slice(-historyDays)
          .map((h: any) => ({
            date: new Date(h.date * 1000).toISOString().split('T')[0],
            price: parseFloat((h.adjustedClose || h.close).toFixed(2)),
          }))
          .filter((d: StockData) => d.price > 0);

        cacheRef.current[cacheKey] = { ts: now, data };
        return data.length > 0 ? data : null;
      } catch { return null; }
    };

    const fetchLiveQuote = async (symbol: string) => {
      try {
        const url = `https://brapi.dev/api/quote/${symbol}?fundamental=false${brapiToken ? `&token=${brapiToken}` : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.results?.[0] ?? null;
      } catch { return null; }
    };

    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);

      let stock1 = await fetchBrapi(stock1Symbol);
      let stock2 = await fetchBrapi(stock2Symbol);
      let usedReal = true;
      if (!stock1) { stock1 = generateStockData(stock1Symbol, historyDays); usedReal = false; }
      if (!stock2) { stock2 = generateStockData(stock2Symbol, historyDays); usedReal = false; }

      if (!usedReal) {
        setFetchError(`Dados simulados — adicione um token brapi.dev para acessar todos os ativos`);
      }

      // Fetch live quote for real-time price display
      if (usedReal) {
        const [q1, q2] = await Promise.all([fetchLiveQuote(stock1Symbol), fetchLiveQuote(stock2Symbol)]);
        if (q1) { setLivePrice1(q1.regularMarketPrice); setLiveChange1(q1.regularMarketChangePercent); }
        if (q2) { setLivePrice2(q2.regularMarketPrice); setLiveChange2(q2.regularMarketChangePercent); }
      } else {
        setLivePrice1(null); setLivePrice2(null); setLiveChange1(null); setLiveChange2(null);
      }

      setDataSource(usedReal ? "real" : "simulado");
      setStock1Data(stock1);
      setStock2Data(stock2);
      setIsLoading(false);
      const spread = generateSpreadData(stock1, stock2);
      setSpreadData(spread);
      const latest = spread[spread.length - 1];
      setLatestSpread(latest.spread);
      setLatestZScore(latest.zScore);
      const decideSignal = (z: number): 'LONG' | 'SHORT' | 'NEUTRAL' => {
        if (zRanges.length > 0) {
          const r = zRanges.find(r => z >= r.min && z <= r.max && r.signal !== 'IGNORAR');
          if (r) { if (r.signal === 'NEUTRO') return 'NEUTRAL'; return r.signal as 'LONG' | 'SHORT'; }
        }
        const absZ = Math.abs(z);
        if (absZ <= 1) return 'NEUTRAL';
        return z > 0 ? 'SHORT' : 'LONG';
      };
      setSignal(decideSignal(latest.zScore));
      if (zRanges.length > 0) {
        const lines: number[] = [];
        zRanges.forEach(r => { lines.push(r.min, r.max); });
        setRangeLines(lines);
      } else setRangeLines([]);
      setHistogramData(generateHistogramData(spread, histBins));
      setDistributionStats(calculateDistributionStats(spread, stock1, stock2));
      setTopSpreads(calculateTopSpreads(spread));
    };

    fetchData();
    const interval = setInterval(fetchData, updateInterval);
    return () => clearInterval(interval);
  }, [stock1Symbol, stock2Symbol, updateInterval, histBins, historyDays, brapiToken, zRanges]);

  useEffect(() => {
    if (spreadData.length > 0 && stock1Data.length > 0 && stock2Data.length > 0) {
      const res = calculateBandasCamadas(
        spreadData,
        stock1Data,
        stock2Data,
        bandaFreqPercent,
        numCamadas,
        { enabled: faixaPersonalizada, min: customSpreadMin, max: customSpreadMax },
        latestSpread
      );
      setResultadoCamadas(res);
    }
  }, [spreadData, stock1Data, stock2Data, bandaFreqPercent, numCamadas, faixaPersonalizada, customSpreadMin, customSpreadMax, latestSpread]);

  const getStockName = (symbol: string) => BRAZILIAN_STOCKS.find(s => s.symbol === symbol)?.name ?? symbol;
  const getLatestPrice = (data: StockData[]) => data.length > 0 ? data[data.length - 1].price : 0;

  const signalConfig = {
    LONG: { label: "LONG", cls: "signal-long", bg: "hsla(142,76%,45%,0.12)", border: "hsla(142,76%,45%,0.3)", Icon: TrendingUp },
    SHORT: { label: "SHORT", cls: "signal-short", bg: "hsla(0,72%,51%,0.12)", border: "hsla(0,72%,51%,0.3)", Icon: TrendingDown },
    NEUTRAL: { label: "NEUTRO", cls: "signal-neutral", bg: "hsla(215,20%,55%,0.08)", border: "hsla(215,20%,55%,0.2)", Icon: Activity },
  };
  const sc = signalConfig[signal];

  const renderBandasCamadasPanel = () => {
    if (!resultadoCamadas) return <div className="text-slate-400 p-6 text-center">Calculando camadas...</div>;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Painel de Controle: Banda de Frequência & Número de Camadas */}
        <div className="glass rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
                <Target className="w-3.5 h-3.5" /> Frequência & Camadas de Spread
              </span>
              <h2 className="text-xl font-black text-white">
                Distribuição Gaussiana — {stock1Symbol} vs {stock2Symbol}
              </h2>
              <p className="text-xs text-slate-400">
                Selecione a banda de probabilidade e divida o intervalo em camadas de spread iguais
              </p>
            </div>

            {/* Toggle de Faixa Personalizada */}
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-emerald-500/40 transition-colors">
              <input
                type="checkbox"
                checked={faixaPersonalizada}
                onChange={e => setFaixaPersonalizada(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-300">Definir Faixa Manualmente</span>
            </label>
          </div>

          {/* Seletores Rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banda de Frequência */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Banda de Frequência Gaussiana ({bandaFreqPercent}%)
              </label>
              <div className="flex flex-wrap gap-2">
                {[60, 68, 70, 80, 90, 95].map(pct => (
                  <button
                    key={pct}
                    disabled={faixaPersonalizada}
                    onClick={() => setBandaFreqPercent(pct)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      bandaFreqPercent === pct && !faixaPersonalizada
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade de Camadas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Divisão em Camadas ({numCamadas} camadas de R$ {resultadoCamadas.step.toFixed(2)})
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[3, 5, 7, 10, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumCamadas(n)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      numCamadas === n
                        ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {n} Camadas
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Se Faixa Personalizada estiver habilitada */}
          {faixaPersonalizada && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Spread Mínimo (R$)</label>
                <input
                  type="number"
                  step="0.10"
                  value={customSpreadMin}
                  onChange={e => setCustomSpreadMin(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Spread Máximo (R$)</label>
                <input
                  type="number"
                  step="0.10"
                  value={customSpreadMax}
                  onChange={e => setCustomSpreadMax(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Cards de Métricas em Destaque no Estilo da Imagem do Caderno */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="glass-strong rounded-xl p-4 border border-emerald-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Spread Mínimo ({faixaPersonalizada ? 'Manual' : `${bandaFreqPercent}%`})</span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                R$ {resultadoCamadas.spreadMin.toFixed(2)}
              </span>
            </div>
            <div className="glass-strong rounded-xl p-4 border border-emerald-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Spread Máximo ({faixaPersonalizada ? 'Manual' : `${bandaFreqPercent}%`})</span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                R$ {resultadoCamadas.spreadMax.toFixed(2)}
              </span>
            </div>
            <div className="glass-strong rounded-xl p-4 border border-cyan-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Passo por Camada</span>
              <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
                R$ {resultadoCamadas.step.toFixed(2)}
              </span>
            </div>
            <div className="glass-strong rounded-xl p-4 border border-violet-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Ocorrências na Banda</span>
              <span className="text-2xl font-black font-mono text-violet-400 mt-1 block">
                {resultadoCamadas.countNaFaixa} <span className="text-sm text-slate-400">({resultadoCamadas.percentNaFaixa}%)</span>
              </span>
            </div>
          </div>

          {/* Painel Operacional - Giro por Camadas (Molde do Estudo de Caso) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="glass-strong rounded-xl p-5 border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">🏆 Pico de Frequência (Moda Gaussiana)</span>
                <span className="text-xs text-amber-200 font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                  Camada #{resultadoCamadas.picoCamadaIndex}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-white">R$ {resultadoCamadas.picoSpreadCenter.toFixed(2)}</span>
                <span className="text-sm font-bold text-amber-300">{resultadoCamadas.picoCount} ocorrências no pico</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Pico onde a diferença de preços ocorreu com maior frequência na história.
              </p>
            </div>

            <div className="glass-strong rounded-xl p-5 border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">🎯 Spread Atual & Giro da Operação</span>
                {resultadoCamadas.camadaAtualIndex && (
                  <span className="text-xs text-cyan-200 font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                    Camada #{resultadoCamadas.camadaAtualIndex}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <span className="text-3xl font-black font-mono text-white">R$ {latestSpread.toFixed(2)}</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {resultadoCamadas.camadaAtualSugestao}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tomada de decisão operacional instantânea na camada onde o spread se encontra agora.
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico da Curva Gaussiana — Idêntico à Frequência do Caderno */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Frequência dos Spreads & Curva Gaussiana</h3>
              <p className="text-xs text-slate-400">
                Região verde central mostra os {bandaFreqPercent}% mais frequentes ({resultadoCamadas.spreadMin.toFixed(2)} a {resultadoCamadas.spreadMax.toFixed(2)})
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Dentro de {bandaFreqPercent}%
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Caudas Externas
              </span>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(210,40%,96%,0.04)" />
                <XAxis dataKey="bin" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `R$${v}`} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<DistributionTooltip />} />
                <ReferenceLine
                  x={resultadoCamadas.spreadMin}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: `Mínimo (${bandaFreqPercent}%): R$ ${resultadoCamadas.spreadMin.toFixed(2)}`, position: 'top', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }}
                />
                <ReferenceLine
                  x={resultadoCamadas.spreadMax}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: `Máximo (${bandaFreqPercent}%): R$ ${resultadoCamadas.spreadMax.toFixed(2)}`, position: 'top', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }}
                />
                <Bar dataKey="frequency" name="Frequência" radius={[4, 4, 0, 0]}>
                  {histogramData.map((entry, index) => {
                    const inBand = entry.bin >= resultadoCamadas.spreadMin && entry.bin <= resultadoCamadas.spreadMax;
                    return <Cell key={`cell-${index}`} fill={inBand ? '#10b981' : '#f59e0b'} opacity={inBand ? 0.9 : 0.6} />;
                  })}
                </Bar>
                <Line type="monotone" dataKey="normal" name="Curva Gaussiana" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Camadas de Spread x Frequência & Preço Médio das Ações */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-base font-bold text-white mb-1">
            Tabela de Camadas ({numCamadas} sub-faixas de R$ {resultadoCamadas.step.toFixed(2)})
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Frequência de ocorrência e Preços Médios de {stock1Symbol} e {stock2Symbol} em cada camada
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold text-slate-400 uppercase">
                  <th className="py-3 px-3">Camada</th>
                  <th className="py-3 px-3">Faixa de Spread</th>
                  <th className="py-3 px-3">Frequência</th>
                  <th className="py-3 px-3">Z-Score</th>
                  <th className="py-3 px-3">Retorno à Média</th>
                  <th className="py-3 px-3">Preço Méd. {stock1Symbol}</th>
                  <th className="py-3 px-3">Preço Méd. {stock2Symbol}</th>
                  <th className="py-3 px-3">Sugestão / Leitura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {resultadoCamadas.camadas.map(camada => {
                  const isAtual = camada.index === resultadoCamadas.camadaAtualIndex;
                  const isPico = camada.index === resultadoCamadas.picoCamadaIndex;

                  return (
                    <tr
                      key={camada.index}
                      className={`transition-colors font-mono ${
                        isAtual
                          ? 'bg-cyan-500/15 border-l-4 border-cyan-400'
                          : isPico
                          ? 'bg-amber-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>#{camada.index}</span>
                          {isAtual && (
                            <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                              ATUAL
                            </span>
                          )}
                          {isPico && !isAtual && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                              PICO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-cyan-400">{camada.rotulo}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white w-16">{camada.count} vezes</span>
                          <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden hidden sm:block">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${Math.min(100, camada.percent * 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">({camada.percent}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-300">
                        {camada.zScoreCamada >= 0 ? '+' : ''}{camada.zScoreCamada} σ
                      </td>
                      <td className="py-3 px-3 font-bold text-cyan-400">
                        {camada.potencialRetornoPct > 0 ? `~${camada.potencialRetornoPct}%` : 'Na Média'}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">R$ {camada.avgPrice1.toFixed(2)}</td>
                      <td className="py-3 px-3 text-violet-400 font-bold">R$ {camada.avgPrice2.toFixed(2)}</td>
                      <td className="py-3 px-3 text-xs font-sans">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border ${
                          isAtual
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}>
                          {camada.sugestao}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Estatístico de Cointegração e Giro Operacional */}
        <div className="glass rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Análise de Cointegração & Estabilidade Operacional do Par
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Estatísticas calculadas a partir de {spreadData.length} períodos para avaliar a segurança da operação Long & Short:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block font-semibold uppercase">Correlação de Pearson</span>
              <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                {(pairStats.correlation * 100).toFixed(0)}% <span className="text-xs text-slate-400 font-normal">(R² = {pairStats.rSquared})</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {pairStats.correlation >= 0.7 ? 'Excelente alinhamento direcional entre os ativos.' : 'Atenção: correlação moderada ou baixa.'}
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block font-semibold uppercase">Beta Relativo do Par</span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {pairStats.beta}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Razão ótima de quantidade (financeiro) para balanceamento do hedge Long & Short.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block font-semibold uppercase">Meia-Vida (Half-Life)</span>
              <div className="text-2xl font-black font-mono text-violet-400 mt-1">
                ~{pairStats.halfLifeDays} períodos
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Tempo estimado para o spread retornar do extremo até o centro da curva Gaussiana.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">

      {/* Error banner */}
      {fetchError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-fade-in">
          <span className="text-base">⚠️</span>
          <span>{fetchError}</span>
          <a href="https://brapi.dev" target="_blank" rel="noopener noreferrer" className="ml-auto underline hover:text-amber-200 whitespace-nowrap">Obter token grátis →</a>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs glass border border-cyan-500/30 text-cyan-400 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-dot-pulse" />
          Atualizando dados...
        </div>
      )}
      {/* ════════════════════════════════════
          HEADER
      ════════════════════════════════════ */}
      <header className="mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-fin-gradient flex items-center justify-center shadow-glow-cyan">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white">Spread</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">Trader</span>
              </h1>
            </div>
            <p className="text-sm text-slate-500 ml-12">Análise de pares · Distribuição Gaussiana · B3</p>
          </div>

          {/* Status + Pair Selectors */}
          <div className="flex flex-col gap-3">
            {/* Status badges */}
            <div className="flex items-center gap-2 justify-end">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${dataSource === 'real' ? 'badge-real' : 'badge-simulated'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dataSource === 'real' ? 'bg-emerald-400 animate-dot-pulse' : 'bg-amber-400'}`} />
                {dataSource === 'real' ? 'Dados Reais' : 'Simulado'}
              </span>
              <button
                onClick={() => setActiveTab('ocorrencias')}
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <ChevronRight className="w-3 h-3" /> Ocorrências
              </button>
            </div>

            {/* Stock selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={stock1Symbol} onValueChange={setStock1Symbol}>
                <SelectTrigger className="w-[180px] bg-fin-surface1 border-white/10 text-slate-200 hover:border-cyan-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STOCKS.map(s => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      <span className="font-mono font-semibold text-cyan-400">{s.symbol}</span>
                      <span className="ml-2 text-slate-400 text-xs">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 text-slate-500 font-bold text-sm">VS</div>

              <Select value={stock2Symbol} onValueChange={setStock2Symbol}>
                <SelectTrigger className="w-[180px] bg-fin-surface1 border-white/10 text-slate-200 hover:border-violet-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STOCKS.filter(s => s.symbol !== stock1Symbol).map(s => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      <span className="font-mono font-semibold text-violet-400">{s.symbol}</span>
                      <span className="ml-2 text-slate-400 text-xs">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={() => setActiveTab('configuracoes')}
                className="w-9 h-9 rounded-xl glass hover:border-white/20 transition-all flex items-center justify-center text-slate-400 hover:text-slate-200"
                aria-label="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                onClick={() => setIsDark(d => !d)}
                className="w-9 h-9 rounded-xl glass hover:border-white/20 transition-all flex items-center justify-center text-slate-400 hover:text-amber-400"
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                title={isDark ? 'Modo Claro' : 'Modo Escuro'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notificações */}
              <button
                onClick={async () => {
                  const perm = await requestPermission();
                  setNotifPermission(perm);
                }}
                className={`w-9 h-9 rounded-xl glass transition-all flex items-center justify-center ${
                  notifPermission === 'granted'
                    ? 'text-emerald-400 border-emerald-500/30'
                    : notifPermission === 'denied'
                    ? 'text-red-400 border-red-500/20 opacity-50 cursor-not-allowed'
                    : 'text-slate-400 hover:text-cyan-400 hover:border-white/20'
                }`}
                aria-label="Alertas"
                title={notifPermission === 'granted' ? 'Alertas ativos' : notifPermission === 'denied' ? 'Alertas bloqueados' : 'Ativar alertas'}
                disabled={notifPermission === 'denied'}
              >
                {notifPermission === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="section-divider mt-6" />
      </header>

      {/* ════════════════════════════════════
          FAROL OPERACIONAL & ACTIONABLE INSIGHTS
      ════════════════════════════════════ */}
      <div className="mb-6 p-4 md:p-5 rounded-2xl glass border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            latestZScore <= -1.5 || signal === 'LONG'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : latestZScore >= 1.5 || signal === 'SHORT'
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
              : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
          }`}>
            {latestZScore <= -1.5 || signal === 'LONG' ? (
              <TrendingUp className="w-6 h-6 animate-pulse" />
            ) : latestZScore >= 1.5 || signal === 'SHORT' ? (
              <TrendingDown className="w-6 h-6 animate-pulse" />
            ) : (
              <Compass className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Farol Quantitativo</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${
                latestZScore <= -1.5 || signal === 'LONG'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : latestZScore >= 1.5 || signal === 'SHORT'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
              }`}>
                {latestZScore <= -1.5 || signal === 'LONG'
                  ? '🟢 Sinal de Compra do Spread'
                  : latestZScore >= 1.5 || signal === 'SHORT'
                  ? '🔴 Sinal de Venda do Spread'
                  : '⚪ Equilíbrio Gaussiano / Neutro'}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              {latestZScore <= -1.5 || signal === 'LONG'
                ? `Spread sobrevendido (Z: ${latestZScore.toFixed(2)} σ). Alta probabilidade de retorno à média.`
                : latestZScore >= 1.5 || signal === 'SHORT'
                ? `Spread sobrecomprado (Z: +${latestZScore.toFixed(2)} σ). Oportunidade de compressão de par.`
                : `Spread dentro da faixa normal de frequência (${bandaFreqPercent}%). Operação na média.`}
            </p>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleCopyReport}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
          >
            {copiedReport ? (
              <>
                <Check className="w-4 h-4" />
                <span>Estudo Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copiar Estudo (WhatsApp)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════
          TERMÔMETRO DIDÁTICO DO Z-SCORE
      ════════════════════════════════════ */}
      <ZScoreThermometer
        zScore={latestZScore}
        stock1Symbol={stock1Symbol}
        stock2Symbol={stock2Symbol}
        halfLifeDays={pairStats.halfLifeDays}
        spreadValue={latestSpread}
      />

      {/* ════════════════════════════════════
          KPI CARDS
      ════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Signal */}
        <div className="kpi-card animate-fade-in-up col-span-2 lg:col-span-1" style={{ borderColor: sc.border, background: sc.bg }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sinal Z-Score</span>
            <sc.Icon className={`w-4 h-4 ${sc.cls} animate-pulse-glow`} />
          </div>
          <div className={`text-3xl font-black tracking-tight ${sc.cls}`}>{sc.label}</div>
          <div className="mt-2 text-xs text-slate-500">
            Desvio Padrão: <span className="text-slate-300 font-mono font-semibold">{latestZScore.toFixed(2)} σ</span>
          </div>
        </div>

        {/* Spread atual */}
        <div className="kpi-card animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Spread Atual</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${latestSpread >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            R$ {latestSpread.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stock1Symbol} <span className="text-slate-600">−</span> {stock2Symbol}
          </div>
        </div>

        {/* Correlação do Par */}
        <div className="kpi-card animate-fade-in-up delay-200 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Correlação do Par</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {(pairStats.correlation * 100).toFixed(0)}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            R²: <span className="text-cyan-300 font-mono">{pairStats.rSquared}</span> · Beta: <span className="text-cyan-300 font-mono">{pairStats.beta}</span>
          </div>
        </div>

        {/* Meia-Vida (Retorno à Média) */}
        <div className="kpi-card animate-fade-in-up delay-300 border border-violet-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Meia-Vida (Half-Life)</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            ~{pairStats.halfLifeDays} <span className="text-sm font-normal text-slate-400">dias</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Tempo est. de reversão à média
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          TABS
      ════════════════════════════════════ */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex gap-1 p-1 rounded-2xl glass min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.key
                  ? 'tab-active'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════
          TAB: RESUMO
      ════════════════════════════════════ */}
      {activeTab === 'resumo' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stock 1 Card */}
            <div className="glass rounded-2xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-xl font-black text-cyan-400">{stock1Symbol}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{getStockName(stock1Symbol)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="text-4xl font-black text-white font-mono">
                R$ {getLatestPrice(stock1Data).toFixed(2)}
              </div>
              <div className="mt-3 text-xs text-slate-500">Preço de fechamento mais recente</div>
            </div>

            {/* Stock 2 Card */}
            <div className="glass rounded-2xl p-6 border border-violet-500/20 hover:border-violet-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-xl font-black text-violet-400">{stock2Symbol}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{getStockName(stock2Symbol)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <div className="text-4xl font-black text-white font-mono">
                R$ {getLatestPrice(stock2Data).toFixed(2)}
              </div>
              <div className="mt-3 text-xs text-slate-500">Preço de fechamento mais recente</div>
            </div>
          </div>

          {/* Spread History mini */}
          <div className="glass rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Spread Recente</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spreadData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(210,40%,96%,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => { const d = new Date(v); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `R$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="spread" name="Spread" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#06b6d4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Destaque Principal: Painel Completo de Frequência & Camadas */}
          {renderBandasCamadasPanel()}
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: BANDAS & CAMADAS ('camadas')
      ════════════════════════════════════ */}
      {activeTab === 'camadas' && renderBandasCamadasPanel()}

      {/* ════════════════════════════════════
          TAB: ESTATÍSTICAS
      ════════════════════════════════════ */}
      {activeTab === 'estatisticas' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Dentro de ±0.5σ', value: distributionStats.withinHalfSigma.count, pct: distributionStats.total > 0 ? (distributionStats.withinHalfSigma.count / distributionStats.total) * 100 : 0, color: 'text-cyan-400', border: 'border-cyan-500/20', p1: distributionStats.withinHalfSigma.avgPrice1, p2: distributionStats.withinHalfSigma.avgPrice2 },
              { label: 'Entre 0.5σ e 1σ', value: distributionStats.withinOneSigma.count - distributionStats.withinHalfSigma.count, pct: distributionStats.total > 0 ? ((distributionStats.withinOneSigma.count - distributionStats.withinHalfSigma.count) / distributionStats.total) * 100 : 0, color: 'text-emerald-400', border: 'border-emerald-500/20', p1: distributionStats.withinOneSigma.avgPrice1, p2: distributionStats.withinOneSigma.avgPrice2 },
              { label: 'Entre 1σ e 2σ', value: distributionStats.withinTwoSigma.count - distributionStats.withinOneSigma.count, pct: distributionStats.total > 0 ? ((distributionStats.withinTwoSigma.count - distributionStats.withinOneSigma.count) / distributionStats.total) * 100 : 0, color: 'text-violet-400', border: 'border-violet-500/20', p1: distributionStats.withinTwoSigma.avgPrice1, p2: distributionStats.withinTwoSigma.avgPrice2 },
              { label: 'Acima de 2σ', value: distributionStats.beyondTwoSigma.count, pct: distributionStats.total > 0 ? (distributionStats.beyondTwoSigma.count / distributionStats.total) * 100 : 0, color: 'text-red-400', border: 'border-red-500/20', p1: distributionStats.beyondTwoSigma.avgPrice1, p2: distributionStats.beyondTwoSigma.avgPrice2 },
            ].map((stat, i) => (
              <div key={i} className={`glass rounded-2xl p-5 border ${stat.border} animate-fade-in-up`} style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-xs text-slate-500 mb-2">{stat.label}</p>
                <div className={`text-2xl font-black ${stat.color}`}>{typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.pct.toFixed(1)}% do total</div>
                <div className="section-divider my-2" />
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p><span className="text-cyan-400 font-mono">{stock1Symbol}</span> R$ {stat.p1.toFixed(2)}</p>
                  <p><span className="text-violet-400 font-mono">{stock2Symbol}</span> R$ {stat.p2.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: OCORRÊNCIAS
      ════════════════════════════════════ */}
      {activeTab === 'ocorrencias' && (
        <div className="animate-fade-in space-y-6">
          {/* Gaussian bands */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-base font-bold text-white mb-1">Ocorrências por Bandas Gaussianas</h2>
            <p className="text-xs text-slate-500 mb-5">Spreads mais relevantes por probabilidade de ocorrência (68% · 95% · 99%)</p>
            {(() => {
              if (spreadData.length === 0) return <p className="text-slate-500 text-sm">Carregando dados...</p>;
              const spreads = spreadData.map(d => d.spread);
              const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
              const stdDev = Math.sqrt(spreads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / spreads.length);
              const z = (s: number) => (s - mean) / (stdDev || 1);
              const gWeight = (x: number) => { if (stdDev === 0) return 0; return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)); };
              const bands = [
                { key: '68', label: '68%', minZ: -1, maxZ: 1, color: 'text-emerald-400', border: 'border-emerald-500/20', bgBadge: 'bg-emerald-500/10' },
                { key: '95', label: '95%', minZ: -1.96, maxZ: 1.96, color: 'text-cyan-400', border: 'border-cyan-500/20', bgBadge: 'bg-cyan-500/10' },
                { key: '99', label: '99%', minZ: -3, maxZ: 3, color: 'text-violet-400', border: 'border-violet-500/20', bgBadge: 'bg-violet-500/10' },
              ].filter(b => relevanceBand === 'all' ? true : b.key === relevanceBand);

              return (
                <div className="space-y-8">
                  {bands.map(b => {
                    const grouped: Record<string, { spread: number; count: number; score: number; examples: { date: string; i: number; z: number }[] }> = {};
                    let bandTotal = 0;
                    spreadData.forEach((d, i) => {
                      const zval = z(d.spread);
                      if (zval < b.minZ || zval > b.maxZ) return;
                      const key = d.spread.toFixed(2);
                      const sc = gWeight(d.spread);
                      if (!grouped[key]) grouped[key] = { spread: parseFloat(key), count: 0, score: 0, examples: [] };
                      grouped[key].count += 1; grouped[key].score += sc; bandTotal += 1;
                      if (grouped[key].examples.length < 3) grouped[key].examples.push({ date: d.date, i, z: zval });
                    });
                    const items = Object.values(grouped).sort((a, b) => { if (b.count !== a.count) return b.count - a.count; if (b.score !== a.score) return b.score - a.score; return Math.abs(a.spread - mean) - Math.abs(b.spread - mean); }).slice(0, occLimit);
                    const maxCount = items[0]?.count ?? 1;

                    return (
                      <div key={b.label}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${b.color} ${b.bgBadge} border ${b.border}`}>
                            Banda {b.label}
                          </span>
                          <span className="text-xs text-slate-500">Z: {b.minZ} → {b.maxZ} · {items.length} spreads distintos</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map(it => {
                            const pct = bandTotal > 0 ? (it.count / bandTotal) * 100 : 0;
                            const barW = (it.count / maxCount) * 100;
                            return (
                              <div key={it.spread} className="occ-card">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-mono font-bold text-sm ${it.spread >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    R$ {it.spread.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                                </div>
                                <div className="spread-bar mb-2">
                                  <div className="spread-bar-fill" style={{ width: `${barW}%` }} />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{it.count} repetições</span>
                                  <span className="text-slate-600">Σ {it.score.toFixed(4)}</span>
                                </div>
                                {it.examples.length > 0 && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors">Ver datas</summary>
                                    <div className="mt-1.5 space-y-0.5">
                                      {it.examples.map((ex, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-slate-600">
                                          <span>{ex.date}</span><span>Z: {ex.z.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Top spreads */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">Top 5 Spreads Mais Frequentes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {topSpreads.map((s, i) => (
                <div key={i} className="glass-strong rounded-xl p-4 text-center border border-white/5 hover:border-cyan-500/30 transition-all">
                  <div className="text-xs text-slate-500 mb-1 font-medium">#{i + 1}</div>
                  <div className={`text-lg font-black font-mono ${s.spread >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {s.spread.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s.frequency.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed occurrences */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <Accordion type="single" collapsible>
              <AccordionItem value="ocorrencias" className="border-white/10">
                <AccordionTrigger className="text-sm font-semibold text-slate-300 hover:text-white hover:no-underline">
                  Ocorrências Detalhadas por Data
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-72 overflow-auto space-y-1 mt-3">
                    {(() => {
                      let list = spreadData.map((d, i) => ({ ...d, i }));
                      if (filterByRanges && zRanges.length > 0) list = list.filter(d => zRanges.some(r => d.zScore >= r.min && d.zScore <= r.max && r.signal !== 'IGNORAR'));
                      if (occSort === 'spread_desc') list.sort((a, b) => b.spread - a.spread);
                      else if (occSort === 'spread_asc') list.sort((a, b) => a.spread - b.spread);
                      else list.sort((a, b) => a.i - b.i);
                      const spreadVals = list.map(d => d.spread);
                      const m = spreadVals.reduce((a, b) => a + b, 0) / (spreadVals.length || 1);
                      const sd = Math.sqrt(spreadVals.map(x => Math.pow(x - m, 2)).reduce((a, b) => a + b, 0) / (spreadVals.length || 1));
                      const weight = (x: number) => { if (sd === 0) return 0; return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - m) / sd, 2)); };
                      list = list.map(d => ({ ...d, score: weight(d.spread) } as any)).sort((a: any, b: any) => b.score - a.score).slice(-occLimit);
                      const itemSignal = (z: number): string => { const r = zRanges.find(r => z >= r.min && z <= r.max && r.signal !== 'IGNORAR'); return r ? (r.signal === 'NEUTRO' ? 'Neutro' : r.signal) : ''; };
                      return list.map(d => (
                        <div key={d.i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 text-xs transition-colors">
                          <span className="text-slate-500 w-24">{d.date}</span>
                          <div className="flex-1 flex items-center gap-3">
                            {showCols.spread && <span className="font-mono font-semibold text-slate-300">R$ {d.spread.toFixed(2)}</span>}
                            {showCols.z && <span className="text-slate-500">Z: {d.zScore.toFixed(2)}</span>}
                            {itemSignal(d.zScore) && <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${itemSignal(d.zScore) === 'LONG' ? 'badge-long' : itemSignal(d.zScore) === 'SHORT' ? 'badge-short' : 'badge-neutral'}`}>{itemSignal(d.zScore)}</span>}
                          </div>
                          <div className="text-right text-slate-600 hidden md:flex gap-3">
                            {showCols.a1 && <span className="text-cyan-500">{stock1Symbol}: R$ {stock1Data[d.i]?.price.toFixed(2)}</span>}
                            {showCols.a2 && <span className="text-violet-500">{stock2Symbol}: R$ {stock2Data[d.i]?.price.toFixed(2)}</span>}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}



      {/* ════════════════════════════════════
          TAB: CONFIGURAÇÕES
      ════════════════════════════════════ */}
      {activeTab === 'configuracoes' && (
        <div className="animate-fade-in space-y-4 max-w-3xl">

          {/* API Token config */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Token API brapi.dev
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              O app consulta cotações reais brasileiras (B3). Os ativos <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">PETR4</code>, <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">VALE3</code>, <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">MGLU3</code> e <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">ITUB4</code> são de uso gratuito ilimitado. Para analisar qualquer outra ação brasileira, insira seu token.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                className="input-dark flex-1"
                placeholder="Insira seu token brapi.dev"
                value={brapiToken}
                onChange={e => setBrapiToken(e.target.value)}
              />
              {brapiToken && (
                <button
                  onClick={() => setBrapiToken('')}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all border border-red-500/20 animate-fade-in"
                >
                  Limpar
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Crie uma conta em <a href="https://brapi.dev" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">brapi.dev</a> para obter um token de acesso instantâneo.
            </p>
          </div>

          {/* Update + Period */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Tempo & Período
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Atualização</label>
                <Select value={updateInterval.toString()} onValueChange={v => setUpdateInterval(Number(v))}>
                  <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={APP_CONFIG.TIMING.UPDATE_INTERVALS.FAST.toString()}>30s</SelectItem>
                    <SelectItem value={APP_CONFIG.TIMING.UPDATE_INTERVALS.REALTIME.toString()}>60s</SelectItem>
                    <SelectItem value={APP_CONFIG.TIMING.UPDATE_INTERVALS.MEDIUM.toString()}>2min</SelectItem>
                    <SelectItem value={APP_CONFIG.TIMING.UPDATE_INTERVALS.SLOW.toString()}>5min</SelectItem>
                    <SelectItem value={APP_CONFIG.TIMING.UPDATE_INTERVALS.HOURLY.toString()}>1h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Período Histórico</label>
                <Select value={historyDays.toString()} onValueChange={v => setHistoryDays(Number(v))}>
                  <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[30, 60, 90, 120, 150].map(d => <SelectItem key={d} value={d.toString()}>{d} dias</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Bins Histograma</label>
                <Select value={histBins.toString()} onValueChange={v => setHistBins(Number(v))}>
                  <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40].map(b => <SelectItem key={b} value={b.toString()}>{b} bins</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Occurrences settings */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-400" /> Ocorrências
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Limite</label>
                <Select value={occLimit.toString()} onValueChange={v => setOccLimit(Number(v))}>
                  <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Ordenação</label>
                <Select value={occSort} onValueChange={(v: any) => setOccSort(v)}>
                  <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="spread_desc">Maior spread</SelectItem>
                    <SelectItem value="spread_asc">Menor spread</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Banda de relevância</label>
              <Select value={relevanceBand} onValueChange={(v: any) => setRelevanceBand(v)}>
                <SelectTrigger className="bg-fin-surface1 border-white/10 text-slate-200 w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas (68%, 95%, 99%)</SelectItem>
                  <SelectItem value="68">Somente 68%</SelectItem>
                  <SelectItem value="95">Somente 95%</SelectItem>
                  <SelectItem value="99">Somente 99%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {[
                { key: 'a1', label: `Preço ${stock1Symbol}` },
                { key: 'a2', label: `Preço ${stock2Symbol}` },
                { key: 'spread', label: 'Spread' },
                { key: 'z', label: 'Z-Score' },
              ].map(col => (
                <label key={col.key} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    className="checkbox-dark"
                    checked={showCols[col.key as keyof typeof showCols]}
                    onChange={e => setShowCols(s => ({ ...s, [col.key]: e.target.checked }))}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Z-Score Ranges */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" /> Faixas de Z-Score (σ) e Sinais
            </h3>
            <label className="text-xs text-slate-400 mb-2 block">Faixas (formato: min..max; min..max)</label>
            <div className="flex gap-2">
              <input
                className="input-dark flex-1"
                placeholder="-3..-1; -1..1; 1..3"
                value={zRangeText}
                onChange={e => setZRangeText(e.target.value)}
              />
              <button
                onClick={() => {
                  const parts = zRangeText.split(';').map(s => s.trim()).filter(Boolean);
                  const parsed: Array<{ min: number; max: number; signal: RangeSignal }> = [];
                  for (const p of parts) {
                    const [a, b] = p.split('..').map(s => Number(s.trim()));
                    if (!isNaN(a) && !isNaN(b)) parsed.push({ min: Math.min(a, b), max: Math.max(a, b), signal: 'NEUTRO' });
                  }
                  setZRanges(parsed);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-sm font-medium transition-all border border-cyan-500/30 hover:border-cyan-500/50 whitespace-nowrap"
              >
                Aplicar
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400 mt-3 cursor-pointer">
              <input type="checkbox" className="checkbox-dark" checked={filterByRanges} onChange={e => setFilterByRanges(e.target.checked)} />
              Filtrar ocorrências pelas faixas definidas
            </label>

            {zRanges.length > 0 && (
              <div className="mt-4 overflow-auto rounded-xl border border-white/10">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2.5 text-left text-slate-400 font-medium">Faixa σ</th>
                      <th className="px-4 py-2.5 text-left text-slate-400 font-medium">Sinal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zRanges.map((r, idx) => (
                      <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2.5 font-mono text-slate-300">{r.min} → {r.max}</td>
                        <td className="px-4 py-2.5">
                          <Select value={r.signal} onValueChange={(v: any) => setZRanges(prev => prev.map((it, i) => i === idx ? { ...it, signal: v as RangeSignal } : it))}>
                            <SelectTrigger className="w-40 bg-fin-surface1 border-white/10 text-slate-200 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LONG">LONG</SelectItem>
                              <SelectItem value="SHORT">SHORT</SelectItem>
                              <SelectItem value="NEUTRO">Neutro</SelectItem>
                              <SelectItem value="IGNORAR">Ignorar</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: BACKTEST (D — Gráfico Z-Score com bandas + C — P&L simulado)
      ════════════════════════════════════ */}
      {activeTab === 'backtest' && (
        <div className="space-y-6 animate-fade-in">
          {/* Config do Backtest */}
          <div className="glass rounded-2xl p-5 border border-white/10 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Entrada (Z-Score ±)</label>
              <input
                type="number" step="0.1" min="0.5" max="3"
                value={backtestZEntry}
                onChange={e => setBacktestZEntry(Number(e.target.value))}
                className="input-dark w-24 text-center font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Saída (Z-Score ±)</label>
              <input
                type="number" step="0.1" min="0" max="1.5"
                value={backtestZExit}
                onChange={e => setBacktestZExit(Number(e.target.value))}
                className="input-dark w-24 text-center font-mono"
              />
            </div>
            <button
              onClick={handleRunBacktest}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              Rodar Backtest
            </button>
          </div>

          {/* KPIs do Backtest */}
          {backtestResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Operações', value: backtestResult.totalTrades, color: 'text-white' },
                  { label: 'Win Rate', value: `${backtestResult.winRate}%`, color: backtestResult.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'P&L Total (Spread %)', value: `${backtestResult.totalPnlPct >= 0 ? '+' : ''}${backtestResult.totalPnlPct}%`, color: backtestResult.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Max Drawdown', value: `-${backtestResult.maxDrawdown}%`, color: 'text-amber-400' },
                  { label: 'P&L Médio por Trade', value: `${backtestResult.avgPnlPct >= 0 ? '+' : ''}${backtestResult.avgPnlPct}%`, color: backtestResult.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Duração Média', value: `${backtestResult.avgDuration} per.`, color: 'text-cyan-400' },
                ].map((kpi, i) => (
                  <div key={i} className="kpi-card animate-fade-in-up">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2">{kpi.label}</span>
                    <div className={`text-2xl font-black font-mono ${kpi.color}`}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Gráfico de Z-Score com Bandas ±1σ / ±2σ */}
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Z-Score Histórico com Bandas de Desvio ±1σ / ±2σ
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={spreadData.map(d => ({ date: d.date.slice(5), z: d.zScore }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[-3.5, 3.5]} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: any) => [`${Number(v).toFixed(2)} σ`, 'Z-Score']} />
                    <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: '+2σ', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={1} stroke="#f97316" strokeDasharray="4 2" strokeWidth={1} label={{ value: '+1σ', fill: '#f97316', fontSize: 10 }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                    <ReferenceLine y={-1} stroke="#22d3ee" strokeDasharray="4 2" strokeWidth={1} label={{ value: '-1σ', fill: '#22d3ee', fontSize: 10 }} />
                    <ReferenceLine y={-2} stroke="#10b981" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: '-2σ', fill: '#10b981', fontSize: 10 }} />
                    <Line type="monotone" dataKey="z" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela de Trades */}
              {backtestResult.trades.length > 0 && (
                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-violet-400" />
                      Operações Simuladas ({backtestResult.totalTrades})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white/5 text-slate-400 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2 px-4 text-left">Entrada</th>
                          <th className="py-2 px-4 text-left">Saída</th>
                          <th className="py-2 px-4">Direção</th>
                          <th className="py-2 px-4">Spread Ent.</th>
                          <th className="py-2 px-4">Spread Saída</th>
                          <th className="py-2 px-4">Z Ent.</th>
                          <th className="py-2 px-4">Dur.</th>
                          <th className="py-2 px-4">P&L %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {backtestResult.trades.map((t, i) => (
                          <tr key={i} className={`hover:bg-white/5 transition-colors ${t.pnlPct >= 0 ? 'border-l-2 border-emerald-500/30' : 'border-l-2 border-red-500/30'}`}>
                            <td className="py-2.5 px-4 text-slate-300">{t.entryDate}</td>
                            <td className="py-2.5 px-4 text-slate-300">{t.exitDate}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-300">R${t.entrySpread.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-center text-slate-300">R${t.exitSpread.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-center text-slate-400">{t.entryZ >= 0 ? '+' : ''}{t.entryZ}</td>
                            <td className="py-2.5 px-4 text-center text-slate-400">{t.durationDays}d</td>
                            <td className={`py-2.5 px-4 text-center font-bold ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: FERRAMENTAS — Calculadora de Sizing & Stop Loss (A + B)
      ════════════════════════════════════ */}
      {activeTab === 'ferramentas' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Calculadora de Sizing & Stop Loss Automático
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Baseado no capital disponível, Z-Score atual, ATR e Beta do par, calcula tamanho de posição e níveis de proteção.
            </p>

            {/* Input de Capital */}
            <div className="flex flex-wrap gap-4 items-end mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Capital Disponível (R$)</label>
                <input
                  type="number" min="1000" step="1000"
                  value={capitalReais}
                  onChange={e => setCapitalReais(Number(e.target.value))}
                  className="input-dark w-40 font-mono"
                />
              </div>
              <button
                onClick={handleCalculateSizing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calcular
              </button>
            </div>

            {stopLossResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sizing */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">📦 Sizing da Posição</h3>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">{stock1Symbol} (LONG)</span>
                    <span className="font-mono font-bold text-emerald-400">{stopLossResult.qty1} ações</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">{stock2Symbol} (SHORT)</span>
                    <span className="font-mono font-bold text-red-400">{stopLossResult.qty2} ações</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-slate-400">Capital Total Alocado</span>
                    <span className="font-mono font-bold text-white">R$ {capitalReais.toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sizing balanceado usando Beta = {pairStats.beta} para neutralidade direcional.
                  </p>
                </div>

                {/* Stop Loss & Take Profit */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 Níveis de Controle de Risco</h3>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">Spread Atual (Entrada)</span>
                    <span className="font-mono font-bold text-white">R$ {latestSpread.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">🔴 Stop Loss (Spread)</span>
                    <span className="font-mono font-bold text-red-400">R$ {stopLossResult.stopLossSpread.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">🟢 Take Profit (Spread)</span>
                    <span className="font-mono font-bold text-emerald-400">R$ {stopLossResult.takeProfitSpread.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">📊 Risk/Reward</span>
                    <span className={`font-mono font-bold ${stopLossResult.riskRewardRatio >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      1 : {stopLossResult.riskRewardRatio}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-slate-400">Perda Máxima Est.</span>
                    <span className="font-mono font-bold text-red-400">- R$ {stopLossResult.maxLossReais.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-slate-400">Ganho Máximo Est.</span>
                    <span className="font-mono font-bold text-emerald-400">+ R$ {stopLossResult.maxGainReais.toFixed(2)}</span>
                  </div>
                </div>

                {/* ATR */}
                <div className="col-span-1 md:col-span-2 bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">⚡ ATR — Volatilidade Média Diária do Spread</h3>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <span className="text-2xl font-black font-mono text-white">{pairStats.atr}</span>
                      <span className="text-xs text-slate-400 ml-1">R$ por período</span>
                    </div>
                    <p className="text-[11px] text-slate-400 self-center max-w-md">
                      O ATR mede o range médio de oscilação do spread por período. Ele define o buffer de proteção do stop loss
                      (1.5× ATR além do spread atual) e calibra o sizing para absorver a volatilidade normal sem acionar paradas prematuras.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: WATCHLIST — Múltiplos Pares (F)
      ════════════════════════════════════ */}
      {activeTab === 'watchlist' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Watchlist de Pares — Monitoramento Simultâneo
            </h2>
            <span className="text-xs text-slate-400">{WATCHLIST_PAIRS.length} pares monitorados</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WATCHLIST_PAIRS.map(([s1, s2]) => {
              const isActive = s1 === stock1Symbol && s2 === stock2Symbol;
              return (
                <button
                  key={`${s1}-${s2}`}
                  onClick={() => { setStock1Symbol(s1); setStock2Symbol(s2); setActiveTab('resumo'); }}
                  className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                    isActive
                      ? 'glass border-cyan-500/50 shadow-glow-cyan bg-cyan-500/10'
                      : 'glass border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-sm">{s1}</span>
                      <span className="text-slate-600 text-xs">vs</span>
                      <span className="font-mono font-bold text-violet-400 text-sm">{s2}</span>
                    </div>
                    {isActive && (
                      <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">ATIVO</span>
                    )}
                  </div>
                  {isActive && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Z-Score</span>
                        <span className={`font-mono font-bold ${latestZScore >= 1.5 ? 'text-red-400' : latestZScore <= -1.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {latestZScore >= 0 ? '+' : ''}{latestZScore.toFixed(2)} σ
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Spread</span>
                        <span className="font-mono text-white">R$ {latestSpread.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Correlação</span>
                        <span className="font-mono text-cyan-400">{(pairStats.correlation * 100).toFixed(0)}%</span>
                      </div>
                      <div className={`mt-2 text-center text-[11px] font-bold py-1 rounded-lg ${
                        signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' :
                        signal === 'SHORT' ? 'bg-red-500/20 text-red-300' :
                        'bg-white/5 text-slate-400'
                      }`}>
                        {signal === 'LONG' ? '🟢 LONG' : signal === 'SHORT' ? '🔴 SHORT' : '⚪ NEUTRO'}
                      </div>
                    </div>
                  )}
                  {!isActive && (
                    <div className="text-xs text-slate-500 mt-1">
                      Clique para analisar este par →
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB: HISTÓRICO DE SINAIS (H)
      ════════════════════════════════════ */}
      {activeTab === 'historico' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-violet-400" />
              Diário de Sinais Operacionais
            </h2>
            <button
              onClick={() => { clearSignals(); setSignalHistory([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Histórico
            </button>
          </div>

          {signalHistory.length === 0 ? (
            <div className="glass rounded-2xl p-10 border border-white/10 text-center">
              <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Nenhum sinal registrado ainda.</p>
              <p className="text-slate-500 text-xs mt-1">Os sinais LONG e SHORT são registrados automaticamente quando gerados.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/5 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2 px-4 text-left">Data / Hora</th>
                      <th className="py-2 px-4 text-left">Par</th>
                      <th className="py-2 px-4 text-center">Sinal</th>
                      <th className="py-2 px-4 text-center">Spread</th>
                      <th className="py-2 px-4 text-center">Z-Score</th>
                      <th className="py-2 px-4 text-left">Sugestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {signalHistory.map(rec => (
                      <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {new Date(rec.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-200">{rec.pair}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' :
                            rec.signal === 'SHORT' ? 'bg-red-500/20 text-red-300' :
                            'bg-white/10 text-slate-400'
                          }`}>
                            {rec.signal}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-300">R${rec.spread.toFixed(2)}</td>
                        <td className={`py-2.5 px-4 text-center font-bold ${Math.abs(rec.zScore) >= 1.5 ? (rec.zScore < 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}`}>
                          {rec.zScore >= 0 ? '+' : ''}{rec.zScore.toFixed(2)} σ
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] max-w-[180px] truncate">{rec.camadaSugestao ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Next.js page component
export default function Page() {
  return <StockPairAnalyzer />;
}
