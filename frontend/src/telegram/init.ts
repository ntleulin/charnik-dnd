import { useEffect, useCallback } from 'react';

export function initTelegram() {
  const webapp = window.Telegram?.WebApp;
  if (webapp) {
    webapp.ready();
    webapp.expand();
  }
}

export function useTelegram() {
  const webapp = window.Telegram?.WebApp;

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    webapp?.HapticFeedback?.impactOccurred(type);
  }, [webapp]);

  const hapticSuccess = useCallback(() => {
    webapp?.HapticFeedback?.notificationOccurred('success');
  }, [webapp]);

  const hapticError = useCallback(() => {
    webapp?.HapticFeedback?.notificationOccurred('error');
  }, [webapp]);

  const hapticSelect = useCallback(() => {
    webapp?.HapticFeedback?.selectionChanged();
  }, [webapp]);

  return {
    webapp,
    user: webapp?.initDataUnsafe?.user as Record<string, string> | undefined,
    colorScheme: webapp?.colorScheme || 'light',
    themeParams: webapp?.themeParams || {},
    haptic,
    hapticSuccess,
    hapticError,
    hapticSelect,
  };
}

export function useBackButton(visible: boolean, onBack: () => void) {
  const webapp = window.Telegram?.WebApp;

  useEffect(() => {
    if (!webapp) return;

    if (visible) {
      webapp.BackButton.show();
      webapp.BackButton.onClick(onBack);
    } else {
      webapp.BackButton.hide();
    }

    return () => {
      webapp.BackButton.offClick(onBack);
    };
  }, [webapp, visible, onBack]);
}

export function useMainButton(text: string, onClick: () => void, visible = true) {
  const webapp = window.Telegram?.WebApp;

  useEffect(() => {
    if (!webapp) return;

    if (visible) {
      webapp.MainButton.setText(text);
      webapp.MainButton.show();
      webapp.MainButton.enable();
      webapp.MainButton.onClick(onClick);
    } else {
      webapp.MainButton.hide();
    }

    return () => {
      webapp.MainButton.offClick(onClick);
      webapp.MainButton.hide();
    };
  }, [webapp, text, onClick, visible]);
}
