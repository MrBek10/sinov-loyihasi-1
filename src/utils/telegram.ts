// Standalone Web Haptic & Environment Utility (Safe for any browser)
export const triggerHaptic = (type: 'success' | 'warning' | 'error' | 'light' | 'medium' | 'selection') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'selection') navigator.vibrate(10);
      else if (type === 'light') navigator.vibrate(15);
      else if (type === 'medium') navigator.vibrate(25);
      else if (type === 'success') navigator.vibrate([15, 30, 20]);
      else if (type === 'error') navigator.vibrate([30, 40, 30]);
    } catch {
      // ignore
    }
  }
};

export const isTelegramWebAppAvailable = (): boolean => false;
export const getTelegramWebApp = () => null;
