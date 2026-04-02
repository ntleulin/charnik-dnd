import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Character } from '../types/character';
import {
  totalLevel,
  calculateMaxHp,
} from '../utils/calculator';
import { useClasses } from '../hooks/useGameData';
import { useBackButton, useTelegram } from '../telegram/init';
import { useSpeciesMap } from '../hooks/useGameData';
import BottomSheet from '../components/BottomSheet';

// Tab components
import CombatTab from '../components/sheet/CombatTab';
import AbilitiesTab from '../components/sheet/AbilitiesTab';
import FeaturesTab from '../components/sheet/FeaturesTab';
import SpellsTab from '../components/sheet/SpellsTab';
import EquipmentTab from '../components/sheet/EquipmentTab';
import NotesTab from '../components/sheet/NotesTab';

type TabId = 'combat' | 'abilities' | 'features' | 'spells' | 'equipment' | 'notes';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'combat', label: 'Бой', icon: '\u2694\uFE0F' },
  { id: 'abilities', label: 'Хар-ки', icon: '\uD83C\uDFB2' },
  { id: 'features', label: 'Умения', icon: '\u2B50' },
  { id: 'spells', label: 'Закл.', icon: '\uD83D\uDD2E' },
  { id: 'equipment', label: 'Снар.', icon: '\uD83C\uDF92' },
  { id: 'notes', label: 'Заметки', icon: '\uD83D\uDCDD' },
];

function loadCharacter(id: string): Character | null {
  const stored = localStorage.getItem('characters');
  if (!stored) return null;
  const chars: Character[] = JSON.parse(stored);
  return chars.find(c => c.id === id) || null;
}

function saveCharacter(char: Character) {
  const stored = localStorage.getItem('characters');
  const chars: Character[] = stored ? JSON.parse(stored) : [];
  const idx = chars.findIndex(c => c.id === char.id);
  const updated = { ...char, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    chars[idx] = updated;
  } else {
    chars.push(updated);
  }
  localStorage.setItem('characters', JSON.stringify(chars));
}

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: classesMap, loading: classesLoading } = useClasses();
  const { data: speciesMap } = useSpeciesMap();

  const [character, setCharacter] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('combat');
  const [showMenu, setShowMenu] = useState(false);

  // Load character
  useEffect(() => {
    if (id) {
      const char = loadCharacter(id);
      if (char) {
        setCharacter(char);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  // Back button
  const handleBack = useCallback(() => navigate('/'), [navigate]);
  useBackButton(true, handleBack);

  // Auto-save on every change
  useEffect(() => {
    if (character) {
      saveCharacter(character);
    }
  }, [character]);

  // Patch function for child tabs
  const handleChange = useCallback((patch: Partial<Character>) => {
    setCharacter(prev => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  // Derived data
  const lvl = character ? totalLevel(character) : 0;

  const classLabel = useMemo(() => {
    if (!character || !classesMap) return '';
    return character.classes
      .map(cls => {
        const info = classesMap[cls.classId];
        return info ? `${info.nameRu} ${cls.level}` : cls.classId;
      })
      .join(' / ');
  }, [character, classesMap]);

  const speciesName = useMemo(() => {
    if (!character || !speciesMap) return '';
    return speciesMap[character.speciesId]?.nameRu || character.speciesId;
  }, [character, speciesMap]);

  // Rest functions
  function shortRest() {
    if (!character || !classesMap) return;
    haptic('medium');
    const newFeatureUsage = { ...character.featureUsage };
    // Restore short rest features
    for (const cls of character.classes) {
      const info = classesMap[cls.classId];
      if (!info?.features) continue;
      for (const feat of Object.values(info.features)) {
        if (feat.restType === 'short' && feat.usesPerRest) {
          newFeatureUsage[feat.id] = 0;
        }
      }
    }
    setCharacter(prev => prev ? { ...prev, featureUsage: newFeatureUsage } : prev);
    setShowMenu(false);
  }

  function longRest() {
    if (!character || !classesMap) return;
    haptic('heavy');
    const newFeatureUsage: Record<string, number> = {};
    // Restore all features
    for (const [key, val] of Object.entries(character.featureUsage)) {
      if (key === 'hitDiceUsed') {
        // Restore half hit dice (round down, min 1)
        newFeatureUsage[key] = Math.max(0, val - Math.max(1, Math.floor(lvl / 2)));
      } else {
        newFeatureUsage[key] = 0;
      }
    }
    // Restore HP
    const maxHp = calculateMaxHp(character, classesMap);
    // Restore spell slots
    const newSpellSlots = { ...character.spellSlots };
    for (const key of Object.keys(newSpellSlots)) {
      newSpellSlots[key] = { ...newSpellSlots[key], used: 0 };
    }
    // Reset death saves
    setCharacter(prev => prev ? {
      ...prev,
      currentHp: maxHp,
      tempHp: 0,
      featureUsage: newFeatureUsage,
      spellSlots: newSpellSlots,
      deathSaves: { successes: 0, failures: 0 },
    } : prev);
    setShowMenu(false);
  }

  function levelUp() {
    // Simple level up: increment primary class level
    if (!character) return;
    haptic('medium');
    const newClasses = [...character.classes];
    if (newClasses.length > 0) {
      newClasses[0] = { ...newClasses[0], level: newClasses[0].level + 1 };
    }
    // Recalculate max HP
    const updated = { ...character, classes: newClasses };
    if (classesMap) {
      updated.maxHp = calculateMaxHp(updated, classesMap);
      updated.currentHp = updated.maxHp;
    }
    setCharacter(updated);
    setShowMenu(false);
  }

  if (!character || classesLoading || !classesMap) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--hint-color)' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--section-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {character.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--hint-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {classLabel} | {speciesName}
          </div>
        </div>
        <button
          className="btn btn--ghost"
          style={{ fontSize: 20, padding: 8, flexShrink: 0 }}
          onClick={() => setShowMenu(true)}
        >
          {'\u22EE'}
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'combat' && (
          <CombatTab character={character} classesMap={classesMap} onChange={handleChange} />
        )}
        {activeTab === 'abilities' && (
          <AbilitiesTab character={character} onChange={handleChange} />
        )}
        {activeTab === 'features' && (
          <FeaturesTab character={character} classesMap={classesMap} onChange={handleChange} />
        )}
        {activeTab === 'spells' && (
          <SpellsTab character={character} classesMap={classesMap} onChange={handleChange} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentTab character={character} classesMap={classesMap} onChange={handleChange} />
        )}
        {activeTab === 'notes' && (
          <NotesTab character={character} onChange={handleChange} />
        )}
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-item${activeTab === tab.id ? ' tab-item--active' : ''}`}
            onClick={() => {
              haptic('light');
              setActiveTab(tab.id);
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Menu Bottom Sheet */}
      <BottomSheet isOpen={showMenu} onClose={() => setShowMenu(false)} title="Действия">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="list-item" onClick={levelUp}>
            <span style={{ fontSize: 18, marginRight: 8 }}>{'\u2B06\uFE0F'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Повысить уровень</div>
              <div style={{ fontSize: 12, color: 'var(--hint-color)' }}>Текущий уровень: {lvl}</div>
            </div>
          </div>
          <div className="list-item" onClick={shortRest}>
            <span style={{ fontSize: 18, marginRight: 8 }}>{'\u2615'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Короткий отдых</div>
              <div style={{ fontSize: 12, color: 'var(--hint-color)' }}>Восстановить умения кор. отдыха</div>
            </div>
          </div>
          <div className="list-item" onClick={longRest}>
            <span style={{ fontSize: 18, marginRight: 8 }}>{'\uD83D\uDECF\uFE0F'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Длинный отдых</div>
              <div style={{ fontSize: 12, color: 'var(--hint-color)' }}>Полное восстановление HP, ячеек, умений</div>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
