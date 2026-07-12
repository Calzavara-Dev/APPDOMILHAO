"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, RotateCcw, Download, Upload, Eye, EyeOff } from "lucide-react";
import APP_CONFIG, { ConfigUtils } from '@/config/app-config';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: (config: any) => void;
}

export default function ConfigPanel({ isOpen, onClose, onConfigChange }: ConfigPanelProps) {
  const [config, setConfig] = useState(APP_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar mudanças na configuração
  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(APP_CONFIG));
  }, [config]);

  // Salvar configurações
  const handleSave = () => {
    Object.assign(APP_CONFIG, config);
    onConfigChange(config);
    setHasChanges(false);
    
    // Salvar no localStorage
    localStorage.setItem('app-config', JSON.stringify(config));
    
    // Mostrar feedback
    alert('Configurações salvas com sucesso!');
  };

  // Resetar configurações
  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
      setConfig(APP_CONFIG);
      ConfigUtils.reset();
      onConfigChange(APP_CONFIG);
      setHasChanges(false);
    }
  };

  // Exportar configurações
  const handleExport = () => {
    const configJson = ConfigUtils.export();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar configurações
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (ConfigUtils.import(content)) {
            setConfig(APP_CONFIG);
            onConfigChange(APP_CONFIG);
            setHasChanges(false);
            alert('Configurações importadas com sucesso!');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('app-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        Object.assign(APP_CONFIG, parsedConfig);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Configurações do App</h2>
            {hasChanges && <Badge variant="destructive">Não salvo</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-4">
          <div className="space-y-6">
            
            {/* Configurações de Trading */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📈 Configurações de Trading</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Limite Z-Score para COMPRA (LONG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.TRADING.Z_SCORE_LIMITS.LONG_THRESHOLD}
                      onChange={(e) => setConfig({
                        ...config,
                        TRADING: {
                          ...config.TRADING,
                          Z_SCORE_LIMITS: {
                            ...config.TRADING.Z_SCORE_LIMITS,
                            LONG_THRESHOLD: parseFloat(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Limite Z-Score para VENDA (SHORT)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.TRADING.Z_SCORE_LIMITS.SHORT_THRESHOLD}
                      onChange={(e) => setConfig({
                        ...config,
                        TRADING: {
                          ...config.TRADING,
                          Z_SCORE_LIMITS: {
                            ...config.TRADING.Z_SCORE_LIMITS,
                            SHORT_THRESHOLD: parseFloat(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Período Histórico (dias)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={config.TRADING.HISTORICAL_PERIOD.DAYS}
                      onChange={(e) => setConfig({
                        ...config,
                        TRADING: {
                          ...config.TRADING,
                          HISTORICAL_PERIOD: {
                            ...config.TRADING.HISTORICAL_PERIOD,
                            DAYS: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Intervalo de Atualização (segundos)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={config.TIMING.UPDATE_INTERVALS.REALTIME / 1000}
                      onChange={(e) => setConfig({
                        ...config,
                        TIMING: {
                          ...config.TIMING,
                          UPDATE_INTERVALS: {
                            ...config.TIMING.UPDATE_INTERVALS,
                            REALTIME: parseInt(e.target.value) * 1000
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Alertas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔔 Configurações de Alertas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.ALERTS.AUDIO.ENABLED}
                      onChange={(e) => setConfig({
                        ...config,
                        ALERTS: {
                          ...config.ALERTS,
                          AUDIO: {
                            ...config.ALERTS.AUDIO,
                            ENABLED: e.target.checked
                          }
                        }
                      })}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Habilitar alertas sonoros</label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Volume do Áudio (0.0 - 1.0)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.ALERTS.AUDIO.VOLUME}
                      onChange={(e) => setConfig({
                        ...config,
                        ALERTS: {
                          ...config.ALERTS,
                          AUDIO: {
                            ...config.ALERTS.AUDIO,
                            VOLUME: parseFloat(e.target.value)
                          }
                        }
                      })}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{config.ALERTS.AUDIO.VOLUME}</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duração do Alerta Visual (ms)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max="10000"
                      value={config.ALERTS.DURATION.VISUAL}
                      onChange={(e) => setConfig({
                        ...config,
                        ALERTS: {
                          ...config.ALERTS,
                          DURATION: {
                            ...config.ALERTS.DURATION,
                            VISUAL: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.ALERTS.NOTIFICATIONS.ENABLED}
                      onChange={(e) => setConfig({
                        ...config,
                        ALERTS: {
                          ...config.ALERTS,
                          NOTIFICATIONS: {
                            ...config.ALERTS.NOTIFICATIONS,
                            ENABLED: e.target.checked
                          }
                        }
                      })}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Notificações do navegador</label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Gráficos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📊 Configurações de Gráficos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Altura Mobile (px)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="400"
                      value={config.CHARTS.HEIGHTS.MOBILE}
                      onChange={(e) => setConfig({
                        ...config,
                        CHARTS: {
                          ...config.CHARTS,
                          HEIGHTS: {
                            ...config.CHARTS.HEIGHTS,
                            MOBILE: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Altura Desktop (px)
                    </label>
                    <input
                      type="number"
                      min="200"
                      max="500"
                      value={config.CHARTS.HEIGHTS.DESKTOP}
                      onChange={(e) => setConfig({
                        ...config,
                        CHARTS: {
                          ...config.CHARTS,
                          HEIGHTS: {
                            ...config.CHARTS.HEIGHTS,
                            DESKTOP: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cor da Ação 1
                    </label>
                    <input
                      type="color"
                      value={config.CHARTS.COLORS.ACTION_1}
                      onChange={(e) => setConfig({
                        ...config,
                        CHARTS: {
                          ...config.CHARTS,
                          COLORS: {
                            ...config.CHARTS.COLORS,
                            ACTION_1: e.target.value
                          }
                        }
                      })}
                      className="w-full h-10 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cor da Ação 2
                    </label>
                    <input
                      type="color"
                      value={config.CHARTS.COLORS.ACTION_2}
                      onChange={(e) => setConfig({
                        ...config,
                        CHARTS: {
                          ...config.CHARTS,
                          COLORS: {
                            ...config.CHARTS.COLORS,
                            ACTION_2: e.target.value
                          }
                        }
                      })}
                      className="w-full h-10 border rounded-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações Avançadas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">⚙️ Configurações Avançadas</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showAdvanced ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Chave da API Alpha Vantage
                      </label>
                      <input
                        type="text"
                        value={config.API.ALPHA_VANTAGE.API_KEY}
                        onChange={(e) => setConfig({
                          ...config,
                          API: {
                            ...config.API,
                            ALPHA_VANTAGE: {
                              ...config.API.ALPHA_VANTAGE,
                              API_KEY: e.target.value
                            }
                          }
                        })}
                        className="w-full p-2 border rounded-md"
                        placeholder="Sua chave da API"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rate Limit (calls/min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.API.ALPHA_VANTAGE.RATE_LIMIT}
                        onChange={(e) => setConfig({
                          ...config,
                          API: {
                            ...config.API,
                            ALPHA_VANTAGE: {
                              ...config.API.ALPHA_VANTAGE,
                              RATE_LIMIT: parseInt(e.target.value)
                            }
                          }
                        })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.API.FALLBACK.ENABLE_SIMULATED_DATA}
                        onChange={(e) => setConfig({
                          ...config,
                          API: {
                            ...config.API,
                            FALLBACK: {
                              ...config.API.FALLBACK,
                              ENABLE_SIMULATED_DATA: e.target.checked
                            }
                          }
                        })}
                        className="rounded"
                      />
                      <label className="text-sm font-medium">Usar dados simulados em caso de erro</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.PERFORMANCE.CACHE.ENABLED}
                        onChange={(e) => setConfig({
                          ...config,
                          PERFORMANCE: {
                            ...config.PERFORMANCE,
                            CACHE: {
                              ...config.PERFORMANCE.CACHE,
                              ENABLED: e.target.checked
                            }
                          }
                        })}
                        className="rounded"
                      />
                      <label className="text-sm font-medium">Habilitar cache</label>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-1" />
              Importar
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

