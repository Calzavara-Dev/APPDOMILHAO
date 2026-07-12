# 🔧 Guia Completo de Personalização

## 📋 **Sistema de Configuração Personalizável**

O app agora possui um sistema completo de configuração que permite personalizar facilmente todos os aspectos do comportamento. Você pode modificar as configurações de duas formas:

### 1. **Interface Gráfica (Recomendado)**
- Clique no ícone de **configurações** (⚙️) no cabeçalho
- Modifique as configurações visualmente
- Salve as alterações

### 2. **Arquivo de Configuração**
- Edite diretamente o arquivo `config/app-config.ts`
- Reinicie o app para aplicar as mudanças

---

## 🎯 **Configurações de Trading**

### **Limites de Z-Score**
```typescript
Z_SCORE_LIMITS: {
  LONG_THRESHOLD: -2.0,    // Sinal de COMPRA (quando Z-Score < -2)
  SHORT_THRESHOLD: 2.0,    // Sinal de VENDA (quando Z-Score > 2)
  NEUTRAL_ZONE: 0.5,       // Zona neutra (±0.5) para evitar sinais falsos
}
```

**Como personalizar:**
- **Mais conservador:** Use ±2.5 ou ±3.0 (menos sinais, mais precisos)
- **Mais agressivo:** Use ±1.5 ou ±1.0 (mais sinais, maior risco)
- **Neutro:** Ajuste `NEUTRAL_ZONE` para reduzir sinais falsos

### **Período Histórico**
```typescript
HISTORICAL_PERIOD: {
  DAYS: 100,               // Quantos dias de histórico analisar
  MIN_DAYS: 30,            // Mínimo de dias necessários
}
```

**Recomendações:**
- **Curto prazo:** 30-50 dias (mais sensível a mudanças recentes)
- **Médio prazo:** 100-150 dias (equilíbrio entre sensibilidade e estabilidade)
- **Longo prazo:** 200-365 dias (mais estável, menos sensível)

---

## ⏰ **Configurações de Tempo**

### **Intervalos de Atualização**
```typescript
UPDATE_INTERVALS: {
  REALTIME: 60000,         // Atualização em tempo real (60 segundos)
  HISTORICAL: 300000,      // Atualização histórica (5 minutos)
  ALERT_CHECK: 10000,      // Verificação de alertas (10 segundos)
}
```

**Considerações:**
- **API Alpha Vantage:** Limite de 5 calls/minuto (gratuito)
- **Mais frequente:** 30-45 segundos (mais dados, maior uso da API)
- **Menos frequente:** 2-5 minutos (economiza API, menos dados)

---

## 📊 **Configurações de Gráficos**

### **Alturas Responsivas**
```typescript
HEIGHTS: {
  MOBILE: 192,             // Altura em mobile (px)
  TABLET: 224,             // Altura em tablet (px)
  DESKTOP: 256,            // Altura em desktop (px)
}
```

### **Cores Personalizáveis**
```typescript
COLORS: {
  ACTION_1: "#3b82f6",     // Cor da ação 1 (azul)
  ACTION_2: "#10b981",      // Cor da ação 2 (verde)
  SPREAD: "#8b5cf6",       // Cor do spread (roxo)
  Z_SCORE: "#f59e0b",      // Cor do Z-Score (laranja)
  LIMITS: "#ef4444",       // Cor das linhas de limite (vermelho)
}
```

**Sugestões de cores:**
- **Tema clássico:** Azul (#3b82f6) + Verde (#10b981)
- **Tema escuro:** Cyan (#06b6d4) + Emerald (#10b981)
- **Tema quente:** Laranja (#f97316) + Rosa (#ec4899)

---

## 🔔 **Configurações de Alertas**

### **Áudio**
```typescript
AUDIO: {
  ENABLED: true,           // Habilitar alertas sonoros
  VOLUME: 0.7,             // Volume do áudio (0.0 a 1.0)
  URL: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3",
}
```

### **Notificações**
```typescript
NOTIFICATIONS: {
  ENABLED: true,           // Habilitar notificações do navegador
  PERMISSION_REQUESTED: false, // Se já solicitou permissão
}
```

**Personalização de áudio:**
- **Som suave:** Use volume 0.3-0.5
- **Som forte:** Use volume 0.8-1.0
- **URL personalizada:** Substitua por seu próprio arquivo de áudio

---

## 🌐 **Configurações de API**

### **Alpha Vantage**
```typescript
ALPHA_VANTAGE: {
  API_KEY: "95SH7ZOVB2X40ZF4", // Sua chave da API
  BASE_URL: "https://www.alphavantage.co/query",
  RATE_LIMIT: 5,           // Máximo de chamadas por minuto
  RETRY_ATTEMPTS: 3,       // Tentativas em caso de erro
}
```

**Como obter sua própria chave:**
1. Acesse: https://www.alphavantage.co/support/#api-key
2. Registre-se gratuitamente
3. Copie sua chave API
4. Substitua no arquivo de configuração

### **Fallback (Dados Simulados)**
```typescript
FALLBACK: {
  ENABLE_SIMULATED_DATA: true, // Usar dados simulados em caso de erro
  SIMULATION_REALISM: 0.8,    // Realismo da simulação (0.0 a 1.0)
}
```

---

## 📱 **Configurações Mobile**

### **Breakpoints Responsivos**
```typescript
BREAKPOINTS: {
  MOBILE: 768,             // Breakpoint para mobile
  TABLET: 1024,            // Breakpoint para tablet
  DESKTOP: 1280,           // Breakpoint para desktop
}
```

### **Touch Gestures**
```typescript
TOUCH: {
  ENABLE_GESTURES: true,   // Habilitar gestos de toque
  SWIPE_THRESHOLD: 50,     // Sensibilidade do swipe
  LONG_PRESS_DELAY: 500,   // Delay para long press (ms)
}
```

---

## 🎨 **Configurações de Tema**

### **Cores Principais**
```typescript
COLORS: {
  PRIMARY: "#3b82f6",      // Cor primária (azul)
  SECONDARY: "#10b981",    // Cor secundária (verde)
  SUCCESS: "#10b981",      // Cor de sucesso
  WARNING: "#f59e0b",      // Cor de aviso
  ERROR: "#ef4444",        // Cor de erro
  BACKGROUND: "#f8fafc",   // Cor de fundo
}
```

### **Modo Escuro**
```typescript
DARK_MODE: {
  ENABLED: false,          // Habilitar modo escuro
  AUTO_DETECT: true,       // Detectar preferência do sistema
}
```

---

## 📈 **Configurações de Performance**

### **Cache**
```typescript
CACHE: {
  ENABLED: true,           // Habilitar cache
  DURATION: 300000,        // Duração do cache (5 minutos)
  MAX_SIZE: 50,            // Máximo de itens no cache
}
```

### **Debounce**
```typescript
DEBOUNCE: {
  SEARCH: 300,             // Debounce para busca (ms)
  RESIZE: 100,             // Debounce para redimensionamento (ms)
}
```

---

## 🔧 **Configurações Avançadas**

### **Desenvolvimento**
```typescript
DEVELOPMENT: {
  ENABLE_DEBUG_MODE: false,  // Modo debug
  SHOW_PERFORMANCE_METRICS: false, // Mostrar métricas de performance
  ENABLE_HOT_RELOAD: true,   // Hot reload em desenvolvimento
}
```

### **Analytics**
```typescript
ANALYTICS: {
  ENABLED: false,            // Habilitar analytics
  TRACK_EVENTS: false,       // Rastrear eventos
  COLLECT_PERFORMANCE: false, // Coletar dados de performance
}
```

---

## 💾 **Gerenciamento de Configurações**

### **Exportar/Importar**
- **Exportar:** Salva configurações em arquivo JSON
- **Importar:** Carrega configurações de arquivo JSON
- **Resetar:** Volta para configurações padrão

### **Persistência**
- Configurações são salvas automaticamente no `localStorage`
- Persistem entre sessões do navegador
- Sincronizam entre abas do mesmo navegador

---

## 🎯 **Exemplos de Personalização**

### **Configuração Conservadora**
```typescript
Z_SCORE_LIMITS: {
  LONG_THRESHOLD: -2.5,
  SHORT_THRESHOLD: 2.5,
  NEUTRAL_ZONE: 1.0,
}
```

### **Configuração Agressiva**
```typescript
Z_SCORE_LIMITS: {
  LONG_THRESHOLD: -1.5,
  SHORT_THRESHOLD: 1.5,
  NEUTRAL_ZONE: 0.2,
}
```

### **Tema Personalizado**
```typescript
COLORS: {
  ACTION_1: "#8b5cf6",     // Roxo
  ACTION_2: "#f59e0b",     // Laranja
  SPREAD: "#06b6d4",       // Cyan
  Z_SCORE: "#ec4899",      // Rosa
  LIMITS: "#ef4444",       // Vermelho
}
```

---

## ⚠️ **Dicas Importantes**

1. **Teste sempre** as configurações antes de usar em produção
2. **Faça backup** das configurações antes de mudanças grandes
3. **Monitore performance** ao alterar intervalos de atualização
4. **Respeite limites** da API Alpha Vantage
5. **Use dados simulados** para testes sem consumir API

---

## 🆘 **Solução de Problemas**

### **Configurações não aplicam:**
- Verifique se salvou as configurações
- Recarregue a página
- Verifique console para erros

### **API não funciona:**
- Verifique sua chave API
- Confirme limite de rate
- Habilite dados simulados como fallback

### **Gráficos não aparecem:**
- Verifique configurações de altura
- Confirme dados históricos carregados
- Teste com dados simulados

---

**🎉 Agora você tem controle total sobre o comportamento do app!**

