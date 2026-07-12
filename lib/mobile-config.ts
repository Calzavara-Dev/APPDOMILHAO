// Configurações específicas para mobile
export const MOBILE_CONFIG = {
  // Intervalos de atualização
  UPDATE_INTERVAL: 60000, // 60 segundos
  
  // Limites de Z-Score para sinais
  Z_SCORE_LIMITS: {
    LONG: -2,   // Sinal de compra
    SHORT: 2,   // Sinal de venda
  },
  
  // Configurações de gráficos para mobile
  CHART_CONFIG: {
    MOBILE_HEIGHT: 192, // 48 * 4 (h-48)
    DESKTOP_HEIGHT: 256, // 64 * 4 (h-64)
    MOBILE_FONT_SIZE: 8,
    DESKTOP_FONT_SIZE: 10,
    MOBILE_STROKE_WIDTH: 1.5,
    DESKTOP_STROKE_WIDTH: 2,
  },
  
  // Configurações de API
  API_CONFIG: {
    MAX_CALLS_PER_MINUTE: 5,
    TIMEOUT: 10000, // 10 segundos
    RETRY_ATTEMPTS: 3,
  },
  
  // Configurações de notificação
  NOTIFICATION_CONFIG: {
    ALERT_DURATION: 3000, // 3 segundos
    AUDIO_URL: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3",
  },
  
  // Breakpoints responsivos
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
  },
};

// Função para detectar se é mobile
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_CONFIG.BREAKPOINTS.MOBILE;
};

// Função para detectar se é tablet
export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= MOBILE_CONFIG.BREAKPOINTS.MOBILE && 
         window.innerWidth < MOBILE_CONFIG.BREAKPOINTS.TABLET;
};

// Função para detectar se é desktop
export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= MOBILE_CONFIG.BREAKPOINTS.TABLET;
};
