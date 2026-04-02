import type { Character } from '../types/character';

const API_URL = import.meta.env.VITE_API_URL || '';

function getInitData(): string {
  try {
    return window.Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (initData) {
    headers['Authorization'] = `tma ${initData}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Ошибка сервера' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Characters API
export async function getCharacters(): Promise<Character[]> {
  return request<Character[]>('/api/characters');
}

export async function createCharacter(data: Partial<Character>): Promise<Character> {
  return request<Character>('/api/characters', {
    method: 'POST',
    body: JSON.stringify(snakeCaseKeys(data)),
  });
}

export async function getCharacter(id: string): Promise<Character> {
  return request<Character>(`/api/characters/${id}`);
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character> {
  return request<Character>(`/api/characters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(snakeCaseKeys(data)),
  });
}

export async function deleteCharacter(id: string): Promise<void> {
  return request<void>(`/api/characters/${id}`, { method: 'DELETE' });
}

// Game Data API (with cache)
const dataCache = new Map<string, unknown>();

export async function getGameData<T>(type: string): Promise<T> {
  if (dataCache.has(type)) return dataCache.get(type) as T;
  const data = await request<T>(`/api/game-data/${type}`);
  dataCache.set(type, data);
  return data;
}

// Convert camelCase to snake_case for backend
function snakeCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Declare Telegram global
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          color: string;
          textColor: string;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          isVisible: boolean;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        themeParams: Record<string, string>;
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}
