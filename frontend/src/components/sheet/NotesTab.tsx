import { useState, useEffect, useRef } from 'react';
import type { Character } from '../../types/character';

interface NotesTabProps {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

export default function NotesTab({ character, onChange }: NotesTabProps) {
  const [text, setText] = useState(character.notes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from character when it changes externally
  useEffect(() => {
    setText(character.notes);
  }, [character.notes]);

  function handleChange(value: string) {
    setText(value);
    // Debounced save
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange({ notes: value });
    }, 500);
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 8 }}>
      <div className="section-title">Заметки</div>
      <textarea
        className="input"
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Заметки о персонаже, сюжетные записи, важные NPC..."
        style={{
          flex: 1,
          resize: 'none',
          minHeight: 300,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}
