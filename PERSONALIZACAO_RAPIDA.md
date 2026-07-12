# ⚡ Personalização Rápida - 5 Minutos

## 🚀 **Personalização Instantânea via Interface**

### **Passo 1: Abrir Configurações**
1. Execute o app: `npm run dev`
2. Clique no ícone ⚙️ no cabeçalho
3. Modifique as configurações desejadas
4. Clique em "Salvar"

### **Passo 2: Configurações Mais Comuns**

#### **🎯 Ajustar Sensibilidade dos Sinais**
- **Mais conservador:** Z-Score ±2.5 (menos sinais)
- **Mais agressivo:** Z-Score ±1.5 (mais sinais)
- **Padrão:** Z-Score ±2.0

#### **⏰ Alterar Intervalo de Atualização**
- **Mais rápido:** 30 segundos
- **Padrão:** 60 segundos  
- **Mais lento:** 120 segundos

#### **🔔 Configurar Alertas**
- **Som:** Liga/desliga + volume
- **Notificações:** Liga/desliga
- **Duração:** Tempo do alerta visual

#### **📊 Personalizar Gráficos**
- **Altura:** Mobile/Desktop
- **Cores:** Escolha suas cores favoritas
- **Fonte:** Tamanho da fonte

---

## 🔧 **Personalização Avançada via Código**

### **Arquivo Principal:** `config/app-config.ts`

#### **Exemplo 1: Configuração Conservadora**
```typescript
Z_SCORE_LIMITS: {
  LONG_THRESHOLD: -2.5,    // Mais conservador
  SHORT_THRESHOLD: 2.5,    // Mais conservador
}
```

#### **Exemplo 2: Tema Personalizado**
```typescript
COLORS: {
  ACTION_1: "#8b5cf6",     // Roxo
  ACTION_2: "#06b6d4",     // Cyan
  SPREAD: "#f59e0b",       // Laranja
}
```

#### **Exemplo 3: Performance Otimizada**
```typescript
UPDATE_INTERVALS: {
  REALTIME: 30000,         // 30 segundos
}
```

---

## 📱 **Configurações Específicas por Dispositivo**

### **Mobile (Telas Pequenas)**
```typescript
CHARTS: {
  HEIGHTS: {
    MOBILE: 160,           // Altura menor
  },
  FONT_SIZES: {
    MOBILE: 7,             // Fonte menor
  },
}
```

### **Desktop (Telas Grandes)**
```typescript
CHARTS: {
  HEIGHTS: {
    DESKTOP: 320,          // Altura maior
  },
  FONT_SIZES: {
    DESKTOP: 12,           // Fonte maior
  },
}
```

---

## 🎨 **Temas Pré-definidos**

### **Tema Clássico (Padrão)**
- Azul + Verde
- Ideal para uso geral

### **Tema Escuro**
- Roxo + Cyan
- Ideal para uso noturno

### **Tema Colorido**
- Rosa + Roxo
- Ideal para personalização

---

## ⚡ **Configurações de Performance**

### **Alta Performance**
```typescript
CACHE: {
  ENABLED: true,
  DURATION: 600000,        // 10 minutos
}
```

### **Economia de API**
```typescript
UPDATE_INTERVALS: {
  REALTIME: 120000,        // 2 minutos
}
```

---

## 🔔 **Configurações de Alertas**

### **Modo Silencioso**
```typescript
ALERTS: {
  AUDIO: {
    ENABLED: false,         // Sem som
  },
  NOTIFICATIONS: {
    ENABLED: false,         // Sem notificações
  },
}
```

### **Alertas Intensos**
```typescript
ALERTS: {
  AUDIO: {
    VOLUME: 1.0,            // Volume máximo
  },
  DURATION: {
    VISUAL: 5000,          // 5 segundos
  },
}
```

---

## 📊 **Configurações de Gráficos**

### **Gráficos Minimalistas**
```typescript
CHARTS: {
  STROKE_WIDTHS: {
    MOBILE: 1.0,            // Linha fina
    DESKTOP: 1.5,
  },
  DOT_SIZES: {
    MOBILE: 2,              // Pontos pequenos
    DESKTOP: 3,
  },
}
```

### **Gráficos Destacados**
```typescript
CHARTS: {
  STROKE_WIDTHS: {
    MOBILE: 2.0,            // Linha grossa
    DESKTOP: 3.0,
  },
  DOT_SIZES: {
    MOBILE: 4,              // Pontos grandes
    DESKTOP: 6,
  },
}
```

---

## 🛠️ **Ferramentas de Configuração**

### **Exportar/Importar**
- **Exportar:** Salva configurações em arquivo
- **Importar:** Carrega configurações de arquivo
- **Resetar:** Volta para padrão

### **Persistência**
- Configurações salvas automaticamente
- Persistem entre sessões
- Sincronizam entre abas

---

## ⚠️ **Dicas Importantes**

1. **Teste sempre** antes de usar em produção
2. **Faça backup** das configurações importantes
3. **Monitore performance** ao alterar intervalos
4. **Respeite limites** da API Alpha Vantage
5. **Use dados simulados** para testes

---

## 🆘 **Solução Rápida de Problemas**

### **Configurações não aplicam:**
- Recarregue a página
- Verifique se salvou
- Confira console para erros

### **API não funciona:**
- Verifique chave API
- Habilite dados simulados
- Confirme limite de rate

### **Gráficos não aparecem:**
- Verifique configurações de altura
- Teste com dados simulados
- Confirme dados carregados

---

## 🎯 **Configurações Recomendadas por Uso**

### **Para Iniciantes:**
- Z-Score ±2.0 (padrão)
- Intervalo 60s
- Alertas moderados

### **Para Traders Experientes:**
- Z-Score ±1.5 (agressivo)
- Intervalo 30s
- Alertas intensos

### **Para Análise Longa:**
- Z-Score ±2.5 (conservador)
- Intervalo 120s
- Período histórico 200 dias

---

**🎉 Em 5 minutos você pode personalizar completamente o app!**

