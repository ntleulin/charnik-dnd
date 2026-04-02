import { useNavigate } from 'react-router-dom';
import { useClasses, useSpeciesMap } from '../hooks/useGameData';

// For MVP, use local storage until backend is connected
function useLocalCharacters() {
  const key = 'dnd_characters';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function remove(id: string) {
    const chars = getAll().filter((c: { id: string }) => c.id !== id);
    localStorage.setItem(key, JSON.stringify(chars));
    return chars;
  }

  return { getAll, remove };
}

export default function CharacterList() {
  const navigate = useNavigate();
  const { data: classesMap } = useClasses();
  const { data: speciesMap } = useSpeciesMap();
  const local = useLocalCharacters();
  const characters = local.getAll();

  const getClassName = (classId: string) =>
    classesMap?.[classId]?.nameRu || classId;

  const getSpeciesName = (speciesId: string) =>
    speciesMap?.[speciesId]?.nameRu || speciesId;

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>Чарник</h1>
          <p style={{ fontSize: 13, color: 'var(--hint-color)' }}>D&D 2024 — Лист персонажа</p>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎲</div>
          <div className="empty-state-title">Нет персонажей</div>
          <div className="empty-state-text">
            Создайте своего первого персонажа для игры в D&D 2024
          </div>
          <button
            className="btn btn--primary"
            style={{ marginTop: 24 }}
            onClick={() => navigate('/create')}
          >
            + Создать персонажа
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {characters.map((char: Record<string, unknown>) => {
            const classes = (char.classes as Array<{ classId: string; level: number }>) || [];
            const classStr = classes
              .map(c => `${getClassName(c.classId)} ${c.level}`)
              .join(' / ');

            return (
              <div
                key={char.id as string}
                className="card"
                onClick={() => navigate(`/character/${char.id}`)}
              >
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>
                        {char.name as string}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--hint-color)', marginTop: 2 }}>
                        {getSpeciesName(char.speciesId as string)} · {classStr}
                      </div>
                    </div>
                    <div className="badge">
                      {classes.reduce((s: number, c: { level: number }) => s + c.level, 0)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="chip">
                      ❤️ {char.currentHp as number}/{char.maxHp as number}
                    </span>
                    <span className="chip">
                      🛡️ КД {char.ac as number || '—'}
                    </span>
                    <span className="chip chip--outline">
                      ⚡ {char.speed as number || 30} фт
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {characters.length > 0 && (
        <button
          className="btn btn--primary btn--round"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
          }}
          onClick={() => navigate('/create')}
        >
          +
        </button>
      )}
    </div>
  );
}
