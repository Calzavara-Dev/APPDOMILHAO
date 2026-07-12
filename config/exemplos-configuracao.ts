// 📋 EXEMPLO DE CONFIGURAÇÃO PERSONALIZADA
// Copie este arquivo e modifique conforme suas necessidades

export const CONFIGURACAO_EXEMPLO = {
  // 🎯 CONFIGURAÇÃO CONSERVADORA (menos sinais, mais precisos)
  TRADING_CONSERVADORA: {
    Z_SCORE_LIMITS: {
      LONG_THRESHOLD: -2.5,    // Mais conservador
      SHORT_THRESHOLD: 2.5,    // Mais conservador
      NEUTRAL_ZONE: 1.0,       // Zona neutra maior
    },
    HISTORICAL_PERIOD: {
      DAYS: 150,               // Período mais longo
      MIN_DAYS: 50,
    },
  },

  // 🎯 CONFIGURAÇÃO AGRESSIVA (mais sinais, maior risco)
  TRADING_AGRESSIVA: {
    Z_SCORE_LIMITS: {
      LONG_THRESHOLD: -1.5,    // Mais agressivo
      SHORT_THRESHOLD: 1.5,    // Mais agressivo
      NEUTRAL_ZONE: 0.2,       // Zona neutra menor
    },
    HISTORICAL_PERIOD: {
      DAYS: 60,                // Período mais curto
      MIN_DAYS: 30,
    },
  },

  // 🎨 TEMA ESCURO PERSONALIZADO
  TEMA_ESCURO: {
    COLORS: {
      PRIMARY: "#8b5cf6",      // Roxo
      SECONDARY: "#06b6d4",    // Cyan
      SUCCESS: "#10b981",      // Verde
      WARNING: "#f59e0b",      // Laranja
      ERROR: "#ef4444",        // Vermelho
      BACKGROUND: "#1f2937",   // Cinza escuro
    },
    CHARTS: {
      COLORS: {
        ACTION_1: "#8b5cf6",   // Roxo
        ACTION_2: "#06b6d4",   // Cyan
        SPREAD: "#f59e0b",     // Laranja
        Z_SCORE: "#ec4899",    // Rosa
        LIMITS: "#ef4444",     // Vermelho
      },
    },
  },

  // 🎨 TEMA COLORIDO PERSONALIZADO
  TEMA_COLORIDO: {
    COLORS: {
      PRIMARY: "#ec4899",      // Rosa
      SECONDARY: "#8b5cf6",    // Roxo
      SUCCESS: "#10b981",      // Verde
      WARNING: "#f59e0b",      // Laranja
      ERROR: "#ef4444",        // Vermelho
      BACKGROUND: "#fef3c7",   // Amarelo claro
    },
    CHARTS: {
      COLORS: {
        ACTION_1: "#ec4899",   // Rosa
        ACTION_2: "#8b5cf6",   // Roxo
        SPREAD: "#06b6d4",     // Cyan
        Z_SCORE: "#f59e0b",    // Laranja
        LIMITS: "#ef4444",     // Vermelho
      },
    },
  },

  // ⚡ CONFIGURAÇÃO DE ALTA PERFORMANCE
  PERFORMANCE_ALTA: {
    TIMING: {
      UPDATE_INTERVALS: {
        REALTIME: 30000,       // 30 segundos
        HISTORICAL: 120000,    // 2 minutos
        ALERT_CHECK: 5000,     // 5 segundos
      },
    },
    PERFORMANCE: {
      CACHE: {
        ENABLED: true,
        DURATION: 600000,      // 10 minutos
        MAX_SIZE: 100,         // Mais itens no cache
      },
      DEBOUNCE: {
        SEARCH: 200,           // Mais rápido
        RESIZE: 50,            // Mais rápido
      },
    },
  },

  // 🔇 CONFIGURAÇÃO SILENCIOSA
  MODO_SILENCIOSO: {
    ALERTS: {
      AUDIO: {
        ENABLED: false,        // Sem áudio
        VOLUME: 0.0,
      },
      NOTIFICATIONS: {
        ENABLED: false,        // Sem notificações
      },
      DURATION: {
        VISUAL: 1000,          // Alerta visual mais curto
        AUDIO: 0,
      },
    },
  },

  // 📱 CONFIGURAÇÃO MOBILE OTIMIZADA
  MOBILE_OTIMIZADO: {
    CHARTS: {
      HEIGHTS: {
        MOBILE: 160,           // Menor altura
        TABLET: 200,
        DESKTOP: 240,
      },
      FONT_SIZES: {
        MOBILE: 7,             // Fonte menor
        DESKTOP: 9,
      },
      STROKE_WIDTHS: {
        MOBILE: 1.2,           // Linha mais fina
        DESKTOP: 1.8,
      },
    },
    MOBILE: {
      TOUCH: {
        SWIPE_THRESHOLD: 30,   // Mais sensível
        LONG_PRESS_DELAY: 300, // Mais rápido
      },
    },
  },

  // 🖥️ CONFIGURAÇÃO DESKTOP OTIMIZADA
  DESKTOP_OTIMIZADO: {
    CHARTS: {
      HEIGHTS: {
        MOBILE: 200,
        TABLET: 280,
        DESKTOP: 320,          // Altura maior
      },
      FONT_SIZES: {
        MOBILE: 10,
        DESKTOP: 12,           // Fonte maior
      },
      STROKE_WIDTHS: {
        MOBILE: 1.8,
        DESKTOP: 2.5,          // Linha mais grossa
      },
    },
  },

  // 🔬 CONFIGURAÇÃO PARA DESENVOLVIMENTO
  DESENVOLVIMENTO: {
    DEVELOPMENT: {
      ENABLE_DEBUG_MODE: true,
      SHOW_PERFORMANCE_METRICS: true,
      ENABLE_HOT_RELOAD: true,
    },
    LOGGING: {
      LEVEL: "debug",          // Logs detalhados
      CONSOLE: {
        ENABLED: true,
        COLORED: true,
      },
    },
    API: {
      FALLBACK: {
        ENABLE_SIMULATED_DATA: true,
        SIMULATION_REALISM: 0.9, // Simulação mais realista
      },
    },
  },

  // 🚀 CONFIGURAÇÃO PARA PRODUÇÃO
  PRODUCAO: {
    DEVELOPMENT: {
      ENABLE_DEBUG_MODE: false,
      SHOW_PERFORMANCE_METRICS: false,
      ENABLE_HOT_RELOAD: false,
    },
    LOGGING: {
      LEVEL: "warn",           // Apenas warnings e erros
      CONSOLE: {
        ENABLED: false,        // Sem logs no console
        COLORED: false,
      },
    },
    SECURITY: {
      CORS: {
        ENABLED: true,
        ALLOWED_ORIGINS: ["https://seudominio.com"], // Seu domínio
      },
      RATE_LIMITING: {
        ENABLED: true,
        MAX_REQUESTS: 50,      // Limite mais alto
      },
    },
  },
};

// 📝 COMO USAR ESTAS CONFIGURAÇÕES:

// 1. Copie a configuração desejada
// 2. Cole no arquivo config/app-config.ts
// 3. Ou use a interface gráfica para aplicar

// Exemplo de uso:
// const minhaConfig = {
//   ...APP_CONFIG,
//   ...CONFIGURACAO_EXEMPLO.TRADING_CONSERVADORA,
//   ...CONFIGURACAO_EXEMPLO.TEMA_ESCURO,
// };

export default CONFIGURACAO_EXEMPLO;

