import { useState, useEffect, useCallback, useRef } from 'react';
import type { Character } from '../types/character';
import * as api from '../api/client';

interface CharactersState {
  characters: Character[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (data: Partial<Character>) => Promise<Character>;
  remove: (id: string) => Promise<void>;
}

export function useCharacters(): CharactersState {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCharacters();
      setCharacters(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (data: Partial<Character>) => {
    const character = await api.createCharacter(data);
    setCharacters(prev => [character, ...prev]);
    return character;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.deleteCharacter(id);
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  return { characters, loading, error, reload, create, remove };
}

interface CharacterState {
  character: Character | null;
  loading: boolean;
  error: string | null;
  update: (changes: Partial<Character>) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useCharacter(id: string): CharacterState {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingChangesRef = useRef<Partial<Character>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCharacter(id);
      setCharacter(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async () => {
    if (!character || Object.keys(pendingChangesRef.current).length === 0) return;
    try {
      const updated = await api.updateCharacter(character.id, pendingChangesRef.current);
      pendingChangesRef.current = {};
      setCharacter(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  }, [character]);

  const update = useCallback((changes: Partial<Character>) => {
    setCharacter(prev => prev ? { ...prev, ...changes } : null);
    pendingChangesRef.current = { ...pendingChangesRef.current, ...changes };

    // Debounced auto-save (500ms)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (Object.keys(pendingChangesRef.current).length === 0) return;
      try {
        const updated = await api.updateCharacter(id, pendingChangesRef.current);
        pendingChangesRef.current = {};
        setCharacter(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      }
    }, 500);
  }, [id]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (Object.keys(pendingChangesRef.current).length > 0 && character) {
        api.updateCharacter(character.id, pendingChangesRef.current).catch(() => {});
      }
    };
  }, [character]);

  return { character, loading, error, update, save, reload };
}
