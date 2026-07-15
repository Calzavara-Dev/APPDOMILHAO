// 📋 CONFIGURAÇÕES PRINCIPAIS DO APP
// Modifique os valores abaixo para personalizar o comportamento

export const APP_CONFIG = {
  // 🎯 CONFIGURAÇÕES DE TRADING
  TRADING: {
    // Limites de Z-Score para gerar sinais
    Z_SCORE_LIMITS: {
      LONG_THRESHOLD: -2.0,    // Sinal de COMPRA (quando Z-Score < -2)
      SHORT_THRESHOLD: 2.0,    // Sinal de VENDA (quando Z-Score > 2)
      NEUTRAL_ZONE: 0.5,       // Zona neutra (±0.5) para evitar sinais falsos
    },

    // Período de análise histórica
    HISTORICAL_PERIOD: {
      DAYS: 252,               // Quantos dias de histórico analisar (1 ano útil B3 ~ 252 pregões)
      MIN_DAYS: 30,            // Mínimo de dias necessários
      MAX_DAYS: 2520,          // Máximo de dias de busca (10 anos de pregões úteis)
    },

    // Configurações de spread
    SPREAD: {
      MIN_SPREAD: 0.01,        // Spread mínimo para considerar válido
      MAX_SPREAD: 1000,        // Spread máximo para evitar outliers
    },
  },

  // ⏰ CONFIGURAÇÕES DE TEMPO
  TIMING: {
    // Intervalos de atualização
    UPDATE_INTERVALS: {
      MANUAL: 0,               // Apenas no Fechamento / Atualização Manual (0s)
      FAST: 30000,            // Atualização rápida (30s)
      REALTIME: 60000,         // Atualização em tempo real (60 segundos)
      MEDIUM: 120000,         // Atualização média (2 min)
      SLOW: 300000,           // Atualização lenta (5 min)
      HOURLY: 3600000,        // Atualização a cada 1 hora
      DAILY: 86400000,        // Atualização para fechamentos do dia (24h)
      HISTORICAL: 300000,     // Atualização histórica (5 minutos)
      ALERT_CHECK: 10000,     // Verificação de alertas (10 segundos)
    },

    // Configurações de timeout
    TIMEOUTS: {
      API_REQUEST: 10000,     // Timeout para requisições API (10s)
      CHART_LOAD: 5000,       // Timeout para carregar gráficos (5s)
    },
  },

  // 📊 CONFIGURAÇÕES DE GRÁFICOS
  CHARTS: {
    // Alturas responsivas
    HEIGHTS: {
      MOBILE: 192,             // Altura em mobile (h-48)
      TABLET: 224,             // Altura em tablet (h-56)
      DESKTOP: 256,            // Altura em desktop (h-64)
    },

    // Configurações de fonte
    FONT_SIZES: {
      MOBILE: 8,               // Tamanho da fonte em mobile
      DESKTOP: 10,             // Tamanho da fonte em desktop
    },

    // Configurações de linha
    STROKE_WIDTHS: {
      MOBILE: 1.5,             // Espessura da linha em mobile
      DESKTOP: 2,              // Espessura da linha em desktop
    },

    // Configurações de pontos
    DOT_SIZES: {
      MOBILE: 3,               // Tamanho dos pontos em mobile
      DESKTOP: 4,              // Tamanho dos pontos em desktop
    },

    // Cores dos gráficos
    COLORS: {
      ACTION_1: "#3b82f6",     // Cor da ação 1 (azul)
      ACTION_2: "#10b981",      // Cor da ação 2 (verde)
      SPREAD: "#8b5cf6",       // Cor do spread (roxo)
      Z_SCORE: "#f59e0b",      // Cor do Z-Score (laranja)
      LIMITS: "#ef4444",       // Cor das linhas de limite (vermelho)
    },
  },

  // 🔔 CONFIGURAÇÕES DE ALERTAS
  ALERTS: {
    // Duração dos alertas
    DURATION: {
      VISUAL: 3000,           // Duração do alerta visual (3 segundos)
      AUDIO: 2000,             // Duração do áudio (2 segundos)
    },

    // Configurações de áudio
    AUDIO: {
      ENABLED: true,           // Habilitar alertas sonoros
      VOLUME: 0.7,             // Volume do áudio (0.0 a 1.0)
      URL: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3",
    },

    // Configurações de notificação
    NOTIFICATIONS: {
      ENABLED: true,           // Habilitar notificações do navegador
      PERMISSION_REQUESTED: false, // Se já solicitou permissão
    },
  },

  // 🌐 CONFIGURAÇÕES DE API
  // ⚠️  Os tokens são lidos das variáveis de ambiente (arquivo .env.local).
  //     NUNCA coloque tokens/chaves diretamente aqui no código!
  API: {
    // brapi.dev (Ações Brasileiras - B3)
    BRAPI: {
      TOKEN: process.env.NEXT_PUBLIC_BRAPI_TOKEN || '', // Configure em .env.local
      BASE_URL: "https://brapi.dev/api",
    },

    // Alpha Vantage
    ALPHA_VANTAGE: {
      API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || '', // Configure em .env.local
      BASE_URL: "https://www.alphavantage.co/query",
      RATE_LIMIT: 5,           // Máximo de chamadas por minuto
      RETRY_ATTEMPTS: 3,       // Tentativas em caso de erro
    },

    // Configurações de fallback
    FALLBACK: {
      ENABLE_SIMULATED_DATA: true, // Usar dados simulados em caso de erro
      SIMULATION_REALISM: 0.8,    // Realismo da simulação (0.0 a 1.0)
    },
  },

  // 📱 CONFIGURAÇÕES MOBILE
  MOBILE: {
    // Breakpoints responsivos
    BREAKPOINTS: {
      MOBILE: 768,             // Breakpoint para mobile
      TABLET: 1024,            // Breakpoint para tablet
      DESKTOP: 1280,           // Breakpoint para desktop
    },

    // Configurações de touch
    TOUCH: {
      ENABLE_GESTURES: true,   // Habilitar gestos de toque
      SWIPE_THRESHOLD: 50,     // Sensibilidade do swipe
      LONG_PRESS_DELAY: 500,   // Delay para long press (ms)
    },

    // Configurações de menu
    MENU: {
      ANIMATION_DURATION: 300, // Duração da animação do menu (ms)
      AUTO_CLOSE_DELAY: 2000,  // Auto-fechar menu após seleção (ms)
    },
  },

  // 🎨 CONFIGURAÇÕES DE TEMA
  THEME: {
    // Cores principais
    COLORS: {
      PRIMARY: "#3b82f6",      // Cor primária (azul)
      SECONDARY: "#10b981",    // Cor secundária (verde)
      SUCCESS: "#10b981",      // Cor de sucesso
      WARNING: "#f59e0b",      // Cor de aviso
      ERROR: "#ef4444",        // Cor de erro
      BACKGROUND: "#f8fafc",   // Cor de fundo
    },

    // Configurações de modo escuro
    DARK_MODE: {
      ENABLED: false,          // Habilitar modo escuro
      AUTO_DETECT: true,       // Detectar preferência do sistema
    },
  },

  // 📈 CONFIGURAÇÕES DE PERFORMANCE
  PERFORMANCE: {
    // Configurações de cache
    CACHE: {
      ENABLED: true,           // Habilitar cache
      DURATION: 300000,        // Duração do cache (5 minutos)
      MAX_SIZE: 50,            // Máximo de itens no cache
    },

    // Configurações de debounce
    DEBOUNCE: {
      SEARCH: 300,             // Debounce para busca (ms)
      RESIZE: 100,             // Debounce para redimensionamento (ms)
    },

    // Configurações de lazy loading
    LAZY_LOADING: {
      ENABLED: true,           // Habilitar lazy loading
      THRESHOLD: 0.1,          // Threshold para carregamento
    },
  },

  // 🔒 CONFIGURAÇÕES DE SEGURANÇA
  SECURITY: {
    // Configurações de CORS — nunca use "*" em produção com compras/dados sensíveis
    CORS: {
      ENABLED: true,
      ALLOWED_ORIGINS: [
        "https://calzavara-dev.github.io", // GitHub Pages
        "http://localhost:3000",            // Desenvolvimento local
      ],
    },

    // Configurações de rate limiting
    RATE_LIMITING: {
      ENABLED: true,
      MAX_REQUESTS: 100,       // Máximo de requisições por hora
    },
  },

  // 📝 CONFIGURAÇÕES DE LOGGING
  LOGGING: {
    // Logs desabilitados em produção para não vazar informações sensíveis
    LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',

    // Configurações de console
    CONSOLE: {
      ENABLED: process.env.NODE_ENV === 'development', // Apenas em dev
      COLORED: process.env.NODE_ENV === 'development',
    },

    // Configurações de arquivo
    FILE: {
      ENABLED: false,
      MAX_SIZE: "10MB",
    },
  },
};

// 🎛️ CONFIGURAÇÕES AVANÇADAS (para desenvolvedores)
export const ADVANCED_CONFIG = {
  // Configurações de desenvolvimento
  DEVELOPMENT: {
    ENABLE_DEBUG_MODE: false,  // Modo debug
    SHOW_PERFORMANCE_METRICS: false, // Mostrar métricas de performance
    ENABLE_HOT_RELOAD: true,   // Hot reload em desenvolvimento
  },

  // Configurações de teste
  TESTING: {
    MOCK_API_RESPONSES: false, // Usar respostas mock da API
    ENABLE_TEST_DATA: false,   // Usar dados de teste
  },

  // Configurações de analytics
  ANALYTICS: {
    ENABLED: false,            // Habilitar analytics
    TRACK_EVENTS: false,       // Rastrear eventos
    COLLECT_PERFORMANCE: false, // Coletar dados de performance
  },
};

// 🔧 FUNÇÕES AUXILIARES PARA CONFIGURAÇÃO
export const ConfigUtils = {
  // Obter configuração aninhada
  get: (path: string, defaultValue?: any) => {
    const keys = path.split('.');
    let value: any = APP_CONFIG;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  // Definir configuração aninhada
  set: (path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = APP_CONFIG;

    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
  },

  // Resetar configurações para padrão
  reset: () => {
    // Implementar reset se necessário
    if (process.env.NODE_ENV === 'development') {
      console.log('Configurações resetadas para padrão');
    }
  },

  // Exportar configurações
  export: () => {
    return JSON.stringify(APP_CONFIG, null, 2);
  },

  // Importar configurações
  import: (configJson: string) => {
    try {
      const config = JSON.parse(configJson);
      Object.assign(APP_CONFIG, config);
      return true;
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return false;
    }
  },
};

// 📱 CONFIGURAÇÕES ESPECÍFICAS POR DISPOSITIVO
export const DEVICE_CONFIG = {
  MOBILE: {
    ...APP_CONFIG,
    CHARTS: {
      ...APP_CONFIG.CHARTS,
      HEIGHTS: {
        MOBILE: 160,           // Menor altura para mobile
        TABLET: 200,
        DESKTOP: 240,
      },
    },
  },

  TABLET: {
    ...APP_CONFIG,
    CHARTS: {
      ...APP_CONFIG.CHARTS,
      HEIGHTS: {
        MOBILE: 180,
        TABLET: 220,
        DESKTOP: 260,
      },
    },
  },

  DESKTOP: {
    ...APP_CONFIG,
    CHARTS: {
      ...APP_CONFIG.CHARTS,
      HEIGHTS: {
        MOBILE: 200,
        TABLET: 240,
        DESKTOP: 280,
      },
    },
  },
};

export default APP_CONFIG;

