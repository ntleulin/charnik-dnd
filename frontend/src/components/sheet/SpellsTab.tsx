import { useState, useMemo } from 'react';
import type { Character } from '../../types/character';
import type { ClassInfo, Spell } from '../../types/game-data';
import {
  spellSaveDC,
  spellAttackBonus,
  formatModifier,
  calculateMulticlassSpellSlots,
} from '../../utils/calculator';
import { useTelegram } from '../../telegram/init';
import { useSpells, useSpellsMap } from '../../hooks/useGameData';
import BottomSheet from '../BottomSheet';

interface SpellsTabProps {
  character: Character;
  classesMap: Record<string, ClassInfo>;
  onChange: (patch: Partial<Character>) => void;
}

const LEVEL_NAMES: Record<number, string> = {
  0: 'Заговоры',
  1: '1 уровень',
  2: '2 уровень',
  3: '3 уровень',
  4: '4 уровень',
  5: '5 уровень',
  6: '6 уровень',
  7: '7 уровень',
  8: '8 уровень',
  9: '9 уровень',
};

export default function SpellsTab({ character, classesMap, onChange }: SpellsTabProps) {
  const { hapticSelect } = useTelegram();
  const { data: allSpells } = useSpells();
  const { data: spellsMap } = useSpellsMap();

  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserLevel, setBrowserLevel] = useState<number | null>(null);

  // Custom spell form state
  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState(0);
  const [customSchool, setCustomSchool] = useState('evocation');
  const [customDesc, setCustomDesc] = useState('');
  const [customCastTime, setCustomCastTime] = useState('1 действие');
  const [customRange, setCustomRange] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customComponents, setCustomComponents] = useState('В, С');
  const [customConcentration, setCustomConcentration] = useState(false);

  const dc = spellSaveDC(character, classesMap);
  const attackBonus = spellAttackBonus(character, classesMap);

  // Spellcasting ability name
  const spellAbility = useMemo(() => {
    for (const cls of character.classes) {
      const info = classesMap[cls.classId];
      if (info?.spellcastingAbility) return info.spellcastingAbility;
    }
    return null;
  }, [character.classes, classesMap]);

  // Calculate spell slots
  const calculatedSlots = useMemo(
    () => calculateMulticlassSpellSlots(character, classesMap),
    [character, classesMap],
  );

  // Merge with character's saved slot state
  const slotLevels = useMemo(() => {
    const levels: { level: number; total: number; used: number }[] = [];
    for (let i = 1; i <= 9; i++) {
      const total = calculatedSlots[i] || character.spellSlots[String(i)]?.total || 0;
      if (total > 0) {
        const used = character.spellSlots[String(i)]?.used || 0;
        levels.push({ level: i, total, used });
      }
    }
    return levels;
  }, [calculatedSlots, character.spellSlots]);

  // Character's known/prepared spells grouped by level
  const spellsByLevel = useMemo(() => {
    const groups: Record<number, Spell[]> = {};
    const spellIds = [...new Set([...character.knownSpells, ...character.preparedSpells])];
    for (const id of spellIds) {
      const spell = spellsMap?.[id];
      if (spell) {
        if (!groups[spell.level]) groups[spell.level] = [];
        groups[spell.level].push(spell);
      }
    }
    return groups;
  }, [character.knownSpells, character.preparedSpells, spellsMap]);

  function toggleSlot(level: number) {
    hapticSelect();
    const key = String(level);
    const current = character.spellSlots[key] || { total: calculatedSlots[level] || 0, used: 0 };
    const newUsed = current.used >= current.total ? 0 : current.used + 1;
    onChange({
      spellSlots: {
        ...character.spellSlots,
        [key]: { total: current.total, used: newUsed },
      },
    });
  }

  function addSpell(spell: Spell) {
    if (!character.knownSpells.includes(spell.id)) {
      onChange({ knownSpells: [...character.knownSpells, spell.id] });
    }
    setShowBrowser(false);
    setBrowserSearch('');
    setBrowserLevel(null);
  }

  function removeSpell(spellId: string) {
    onChange({
      knownSpells: character.knownSpells.filter(s => s !== spellId),
      preparedSpells: character.preparedSpells.filter(s => s !== spellId),
    });
  }

  function addCustomSpell() {
    if (!customName.trim()) return;
    // Create a custom spell id
    const customId = `custom_${Date.now()}`;
    // We store custom spells in knownSpells with special prefix
    // For display, we'll store the data in localStorage separately
    const customSpell: Spell = {
      id: customId,
      nameRu: customName,
      nameEn: customName,
      level: customLevel,
      school: customSchool,
      castingTime: customCastTime,
      range: customRange,
      components: customComponents,
      duration: customDuration,
      concentration: customConcentration,
      ritual: false,
      descriptionRu: customDesc,
      descriptionEn: customDesc,
      classes: [],
    };
    // Store custom spell data
    const stored = JSON.parse(localStorage.getItem('customSpells') || '{}');
    stored[customId] = customSpell;
    localStorage.setItem('customSpells', JSON.stringify(stored));

    onChange({ knownSpells: [...character.knownSpells, customId] });
    setShowCustomForm(false);
    resetCustomForm();
  }

  function resetCustomForm() {
    setCustomName('');
    setCustomLevel(0);
    setCustomSchool('evocation');
    setCustomDesc('');
    setCustomCastTime('1 действие');
    setCustomRange('');
    setCustomDuration('');
    setCustomComponents('В, С');
    setCustomConcentration(false);
  }


  // Browser filtered spells
  const browserSpells = useMemo(() => {
    if (!allSpells) return [];
    return allSpells.filter(s => {
      if (character.knownSpells.includes(s.id)) return false;
      if (browserLevel !== null && s.level !== browserLevel) return false;
      if (browserSearch) {
        const q = browserSearch.toLowerCase();
        return s.nameRu.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allSpells, character.knownSpells, browserLevel, browserSearch]);

  const ABILITY_SHORT: Record<string, string> = {
    int: 'ИНТ', wis: 'МДР', cha: 'ХАР', str: 'СИЛ', dex: 'ЛОВ', con: 'ТЕЛ',
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 8 }}>
      {/* Spellcasting Header */}
      {spellAbility && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">СЛ Закл.</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{dc}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Атака</div>
            <div className="stat-mod">{formatModifier(attackBonus)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Характ.</div>
            <div className="stat-mod">{ABILITY_SHORT[spellAbility] || spellAbility}</div>
          </div>
        </div>
      )}

      {/* Spell Slots */}
      {slotLevels.length > 0 && (
        <div className="section">
          <div className="section-title">Ячейки заклинаний</div>
          <div className="card" style={{ padding: '8px 16px' }}>
            {slotLevels.map(({ level, total, used }) => {
              const avail = total - used;
              return (
                <div
                  key={level}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60 }}>
                    {level} ур.
                  </span>
                  <div className="usage-circles">
                    {Array.from({ length: total }).map((_, i) => (
                      <div
                        key={i}
                        className={`usage-circle${i < avail ? ' usage-circle--filled' : ''}`}
                        onClick={() => toggleSlot(level)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spells by Level */}
      {Object.keys(spellsByLevel).length === 0 && !spellAbility && (
        <div className="empty-state">
          <div className="empty-state-icon">&#x2728;</div>
          <div className="empty-state-title">Нет заклинаний</div>
          <div className="empty-state-text">Этот персонаж не владеет магией</div>
        </div>
      )}

      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
        const spells = spellsByLevel[level];
        if (!spells || spells.length === 0) {
          // Also check custom spells for this level
          const customStored = JSON.parse(localStorage.getItem('customSpells') || '{}');
          const customForLevel = character.knownSpells
            .filter(id => id.startsWith('custom_') && customStored[id]?.level === level)
            .map(id => customStored[id] as Spell);
          if (customForLevel.length === 0) return null;
          // Merge custom spells
          const allForLevel = customForLevel;
          return (
            <div key={level} className="section">
              <div className="section-title">{LEVEL_NAMES[level]}</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {allForLevel.map(spell => (
                  <SpellRow key={spell.id} spell={spell} onTap={() => setSelectedSpell(spell)} onRemove={() => removeSpell(spell.id)} />
                ))}
              </div>
            </div>
          );
        }
        // Merge with custom spells of same level
        const customStored = JSON.parse(localStorage.getItem('customSpells') || '{}');
        const customForLevel = character.knownSpells
          .filter(id => id.startsWith('custom_') && customStored[id]?.level === level)
          .map(id => customStored[id] as Spell);
        const allForLevel = [...spells, ...customForLevel];

        return (
          <div key={level} className="section">
            <div className="section-title">{LEVEL_NAMES[level]}</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {allForLevel.map(spell => (
                <SpellRow key={spell.id} spell={spell} onTap={() => setSelectedSpell(spell)} onRemove={() => removeSpell(spell.id)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Manage Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn--secondary btn--sm"
          style={{ flex: 1 }}
          onClick={() => setShowBrowser(true)}
        >
          Добавить заклинание
        </button>
        <button
          className="btn btn--secondary btn--sm"
          style={{ flex: 1 }}
          onClick={() => setShowCustomForm(true)}
        >
          Своё заклинание
        </button>
      </div>

      {/* Spell Detail Bottom Sheet */}
      <BottomSheet
        isOpen={selectedSpell !== null}
        onClose={() => setSelectedSpell(null)}
        title={selectedSpell?.nameRu}
      >
        {selectedSpell && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--hint-color)', marginBottom: 8 }}>
              {selectedSpell.nameEn}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              <span className="chip">{LEVEL_NAMES[selectedSpell.level]}</span>
              <span className="chip">{SCHOOL_NAMES[selectedSpell.school] || selectedSpell.school}</span>
              {selectedSpell.concentration && <span className="chip chip--accent">Концентрация</span>}
              {selectedSpell.ritual && <span className="chip chip--outline">Ритуал</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13, marginBottom: 12 }}>
              <div><strong>Время:</strong> {selectedSpell.castingTime}</div>
              <div><strong>Дистанция:</strong> {selectedSpell.range}</div>
              <div><strong>Компоненты:</strong> {selectedSpell.components}</div>
              <div><strong>Длительность:</strong> {selectedSpell.duration}</div>
            </div>
            {selectedSpell.material && (
              <div style={{ fontSize: 12, color: 'var(--hint-color)', marginBottom: 8, fontStyle: 'italic' }}>
                Материал: {selectedSpell.material}
              </div>
            )}
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selectedSpell.descriptionRu}
            </div>
            {selectedSpell.higherLevelRu && (
              <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>На более высоких уровнях:</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--hint-color)' }}>
                  {selectedSpell.higherLevelRu}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Spell Browser Bottom Sheet */}
      <BottomSheet
        isOpen={showBrowser}
        onClose={() => { setShowBrowser(false); setBrowserSearch(''); setBrowserLevel(null); }}
        title="Добавить заклинание"
      >
        <div style={{ marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Поиск..."
            value={browserSearch}
            onChange={e => setBrowserSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          <span
            className={`chip ${browserLevel === null ? 'chip--accent' : 'chip--outline'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setBrowserLevel(null)}
          >
            Все
          </span>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
            <span
              key={l}
              className={`chip ${browserLevel === l ? 'chip--accent' : 'chip--outline'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setBrowserLevel(l)}
            >
              {l === 0 ? 'Загов.' : `${l} ур.`}
            </span>
          ))}
        </div>
        <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {browserSpells.slice(0, 50).map(spell => (
            <div
              key={spell.id}
              className="list-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
              onClick={() => addSpell(spell)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{spell.nameRu}</span>
                <span className="chip" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {spell.level === 0 ? 'Загов.' : `${spell.level} ур.`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--hint-color)' }}>
                  {SCHOOL_NAMES[spell.school] || spell.school}
                </span>
                {spell.concentration && <span style={{ fontSize: 11, color: 'var(--button-color)' }}>К</span>}
                {spell.ritual && <span style={{ fontSize: 11, color: 'var(--hint-color)' }}>Р</span>}
              </div>
            </div>
          ))}
          {browserSpells.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint-color)' }}>
              Ничего не найдено
            </div>
          )}
          {browserSpells.length > 50 && (
            <div style={{ padding: 8, textAlign: 'center', color: 'var(--hint-color)', fontSize: 12 }}>
              Показаны первые 50. Уточните поиск.
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Custom Spell Form Bottom Sheet */}
      <BottomSheet
        isOpen={showCustomForm}
        onClose={() => { setShowCustomForm(false); resetCustomForm(); }}
        title="Своё заклинание"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" placeholder="Название" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={customLevel} onChange={e => setCustomLevel(parseInt(e.target.value))} style={{ flex: 1 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
                <option key={l} value={l}>{LEVEL_NAMES[l]}</option>
              ))}
            </select>
            <select className="input" value={customSchool} onChange={e => setCustomSchool(e.target.value)} style={{ flex: 1 }}>
              {Object.entries(SCHOOL_NAMES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <input className="input" placeholder="Время накладывания" value={customCastTime} onChange={e => setCustomCastTime(e.target.value)} />
          <input className="input" placeholder="Дистанция" value={customRange} onChange={e => setCustomRange(e.target.value)} />
          <input className="input" placeholder="Компоненты" value={customComponents} onChange={e => setCustomComponents(e.target.value)} />
          <input className="input" placeholder="Длительность" value={customDuration} onChange={e => setCustomDuration(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={customConcentration} onChange={e => setCustomConcentration(e.target.checked)} />
            Концентрация
          </label>
          <textarea className="input" placeholder="Описание" value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={4} style={{ resize: 'vertical' }} />
          <button className="btn btn--primary btn--full" onClick={addCustomSpell} disabled={!customName.trim()}>
            Добавить
          </button>
        </div>
      </BottomSheet>

      {/* Dice Roller not needed here but keeping pattern consistent */}
    </div>
  );
}

// Spell row sub-component
function SpellRow({ spell, onTap, onRemove }: { spell: Spell; onTap: () => void; onRemove: () => void }) {
  return (
    <div
      className="list-item"
      style={{ justifyContent: 'space-between', padding: '8px 16px' }}
      onClick={onTap}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {spell.nameRu}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--hint-color)' }}>
            {SCHOOL_NAMES[spell.school] || spell.school}
          </span>
          {spell.concentration && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--button-color)' }}>К</span>
          )}
          {spell.ritual && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--hint-color)' }}>Р</span>
          )}
        </div>
      </div>
      <button
        className="btn btn--ghost btn--sm"
        style={{ color: 'var(--destructive)', padding: 4, fontSize: 12 }}
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
      >
        x
      </button>
    </div>
  );
}

const SCHOOL_NAMES: Record<string, string> = {
  abjuration: 'Ограждение',
  conjuration: 'Вызов',
  divination: 'Прорицание',
  enchantment: 'Очарование',
  evocation: 'Воплощение',
  illusion: 'Иллюзия',
  necromancy: 'Некромантия',
  transmutation: 'Преобразование',
};
