import { useState } from 'react';
import type { Character } from '../../types/character';
import { CONDITIONS } from '../../types/character';
import type { ClassInfo } from '../../types/game-data';
import {
  calculateAC,
  proficiencyBonus,
  totalLevel,
  abilityModifier,
  formatModifier,
} from '../../utils/calculator';
import { rollHitDice } from '../../utils/dice';
import { useTelegram } from '../../telegram/init';
import { useEquipmentMap } from '../../hooks/useGameData';
import DiceRoller from '../DiceRoller';
import BottomSheet from '../BottomSheet';

interface CombatTabProps {
  character: Character;
  classesMap: Record<string, ClassInfo>;
  onChange: (patch: Partial<Character>) => void;
}

export default function CombatTab({ character, classesMap, onChange }: CombatTabProps) {
  const { haptic, hapticSelect } = useTelegram();
  const { data: equipmentMap } = useEquipmentMap();
  const [diceRoll, setDiceRoll] = useState<{ notation: string; label: string } | null>(null);
  const [editingHp, setEditingHp] = useState(false);
  const [editingTempHp, setEditingTempHp] = useState(false);
  const [hpInput, setHpInput] = useState('');
  const [tempHpInput, setTempHpInput] = useState('');
  const [showConditions, setShowConditions] = useState(false);
  const [hitDiceResult, setHitDiceResult] = useState<number | null>(null);

  const lvl = totalLevel(character);
  const profBonus = proficiencyBonus(lvl);
  const ac = equipmentMap ? calculateAC(character, equipmentMap) : 10;
  const dexMod = abilityModifier(character.abilityScores.dex);
  const conMod = abilityModifier(character.abilityScores.con);

  // HP percentage for color
  const hpPct = character.maxHp > 0 ? (character.currentHp / character.maxHp) * 100 : 0;
  const hpColor = hpPct > 50 ? '#27ae60' : hpPct > 25 ? '#f39c12' : '#e74c3c';

  // Hit dice available: total level - used (track via featureUsage.hitDiceUsed)
  const hitDiceUsed = character.featureUsage['hitDiceUsed'] || 0;
  const hitDiceAvail = Math.max(0, lvl - hitDiceUsed);

  // Primary class hit die
  const primaryClass = character.classes[0];
  const primaryClassInfo = primaryClass ? classesMap[primaryClass.classId] : null;
  const hitDie = primaryClassInfo?.hitDie || 'd8';

  function handleHpSave() {
    const val = parseInt(hpInput);
    if (!isNaN(val)) {
      onChange({ currentHp: Math.max(0, Math.min(val, character.maxHp)) });
    }
    setEditingHp(false);
  }

  function handleTempHpSave() {
    const val = parseInt(tempHpInput);
    if (!isNaN(val)) {
      onChange({ tempHp: Math.max(0, val) });
    }
    setEditingTempHp(false);
  }

  function toggleDeathSuccess(i: number) {
    hapticSelect();
    const current = character.deathSaves.successes;
    const newVal = current > i ? i : i + 1;
    onChange({ deathSaves: { ...character.deathSaves, successes: newVal } });
  }

  function toggleDeathFailure(i: number) {
    hapticSelect();
    const current = character.deathSaves.failures;
    const newVal = current > i ? i : i + 1;
    onChange({ deathSaves: { ...character.deathSaves, failures: newVal } });
  }

  function addCondition(key: string) {
    if (!character.conditions.includes(key)) {
      haptic('light');
      onChange({ conditions: [...character.conditions, key] });
    }
    setShowConditions(false);
  }

  function removeCondition(key: string) {
    haptic('light');
    onChange({ conditions: character.conditions.filter(c => c !== key) });
  }

  function rollInitiative() {
    const mod = dexMod;
    setDiceRoll({
      notation: `1d20${mod >= 0 ? '+' + mod : String(mod)}`,
      label: 'Инициатива',
    });
  }

  function useHitDie() {
    if (hitDiceAvail <= 0) return;
    haptic('medium');
    const result = rollHitDice(hitDie, conMod);
    const healing = Math.max(result.total, 0);
    setHitDiceResult(healing);
    const newHp = Math.min(character.currentHp + healing, character.maxHp);
    onChange({
      currentHp: newHp,
      featureUsage: { ...character.featureUsage, hitDiceUsed: hitDiceUsed + 1 },
    });
    setDiceRoll({
      notation: `1${hitDie}${conMod >= 0 ? '+' + conMod : String(conMod)}`,
      label: `Кость хитов (${hitDie})`,
    });
  }

  return (
    <div className="page fade-in" style={{ paddingBottom: 8 }}>
      {/* HP Bar */}
      <div className="section">
        <div
          className="card"
          style={{ padding: '12px 16px', cursor: 'pointer' }}
          onClick={() => {
            setHpInput(String(character.currentHp));
            setEditingHp(true);
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hint-color)' }}>HP</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>
              <span style={{ color: hpColor }}>{character.currentHp}</span>
              <span style={{ color: 'var(--hint-color)', fontSize: 16 }}> / {character.maxHp}</span>
            </span>
          </div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: 'var(--secondary-bg)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, hpPct))}%`,
              background: hpColor,
              borderRadius: 4,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {/* Temp HP */}
        <div
          className="stat-card"
          onClick={() => {
            setTempHpInput(String(character.tempHp));
            setEditingTempHp(true);
          }}
        >
          <div className="stat-label">Врем.HP</div>
          <div className="stat-value" style={{ fontSize: 18, color: '#3498db' }}>{character.tempHp}</div>
        </div>

        {/* AC */}
        <div className="stat-card">
          <div className="stat-label">КЗ</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{ac}</div>
        </div>

        {/* Initiative */}
        <div className="stat-card" onClick={rollInitiative}>
          <div className="stat-label">Иниц.</div>
          <div className="stat-mod">{formatModifier(dexMod)}</div>
        </div>

        {/* Proficiency */}
        <div className="stat-card">
          <div className="stat-label">Бонус</div>
          <div className="stat-mod">{formatModifier(profBonus)}</div>
        </div>
      </div>

      {/* Speed */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="chip">
          Скорость: {character.speed} фт.
        </div>
      </div>

      {/* Death Saves */}
      {character.currentHp === 0 && (
        <div className="section">
          <div className="section-title">Спасброски от смерти</div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--hint-color)' }}>Успехи</span>
              <div className="usage-circles">
                {[0, 1, 2].map(i => (
                  <div
                    key={`s${i}`}
                    className={`usage-circle${i < character.deathSaves.successes ? ' usage-circle--filled' : ''}`}
                    style={{ borderColor: '#27ae60', background: i < character.deathSaves.successes ? '#27ae60' : 'transparent' }}
                    onClick={() => toggleDeathSuccess(i)}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--hint-color)' }}>Провалы</span>
              <div className="usage-circles">
                {[0, 1, 2].map(i => (
                  <div
                    key={`f${i}`}
                    className={`usage-circle${i < character.deathSaves.failures ? ' usage-circle--filled' : ''}`}
                    style={{ borderColor: '#e74c3c', background: i < character.deathSaves.failures ? '#e74c3c' : 'transparent' }}
                    onClick={() => toggleDeathFailure(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="section">
        <div className="section-title">Состояния</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {character.conditions.map(c => (
            <div key={c} className="chip" style={{ background: 'var(--destructive)', color: '#fff' }}>
              {CONDITIONS[c] || c}
              <span
                style={{ marginLeft: 4, cursor: 'pointer', fontWeight: 700 }}
                onClick={() => removeCondition(c)}
              >
                x
              </span>
            </div>
          ))}
          <div
            className="chip chip--outline"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowConditions(true)}
          >
            + Добавить
          </div>
        </div>
      </div>

      {/* Hit Dice */}
      <div className="section">
        <div className="section-title">Кости хитов</div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{hitDiceAvail}</span>
              <span style={{ fontSize: 13, color: 'var(--hint-color)' }}> / {lvl} ({hitDie})</span>
            </div>
            <button
              className="btn btn--sm btn--primary"
              disabled={hitDiceAvail <= 0}
              onClick={useHitDie}
              style={{ opacity: hitDiceAvail <= 0 ? 0.5 : 1 }}
            >
              Бросить
            </button>
          </div>
          {hitDiceResult !== null && (
            <div style={{ fontSize: 12, color: '#27ae60', marginTop: 4 }}>
              Восстановлено: +{hitDiceResult} HP
            </div>
          )}
        </div>
      </div>

      {/* Edit HP Bottom Sheet */}
      <BottomSheet isOpen={editingHp} onClose={() => setEditingHp(false)} title="Изменить HP">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="number"
            value={hpInput}
            onChange={e => setHpInput(e.target.value)}
            autoFocus
            style={{ textAlign: 'center', fontSize: 24, fontWeight: 700 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--danger btn--sm" style={{ flex: 1 }} onClick={() => {
              const val = parseInt(hpInput);
              if (!isNaN(val)) setHpInput(String(Math.max(0, character.currentHp - val)));
              else setHpInput(String(character.currentHp));
            }}>
              Урон
            </button>
            <button className="btn btn--sm" style={{ flex: 1, background: '#27ae60', color: '#fff' }} onClick={() => {
              const val = parseInt(hpInput);
              if (!isNaN(val)) setHpInput(String(Math.min(character.maxHp, character.currentHp + val)));
              else setHpInput(String(character.currentHp));
            }}>
              Лечение
            </button>
          </div>
          <button className="btn btn--primary btn--full" onClick={handleHpSave}>
            Сохранить
          </button>
        </div>
      </BottomSheet>

      {/* Edit Temp HP Bottom Sheet */}
      <BottomSheet isOpen={editingTempHp} onClose={() => setEditingTempHp(false)} title="Временные HP">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="number"
            value={tempHpInput}
            onChange={e => setTempHpInput(e.target.value)}
            autoFocus
            style={{ textAlign: 'center', fontSize: 24, fontWeight: 700 }}
          />
          <button className="btn btn--primary btn--full" onClick={handleTempHpSave}>
            Сохранить
          </button>
        </div>
      </BottomSheet>

      {/* Conditions Picker */}
      <BottomSheet isOpen={showConditions} onClose={() => setShowConditions(false)} title="Добавить состояние">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(CONDITIONS)
            .filter(([key]) => !character.conditions.includes(key))
            .map(([key, label]) => (
              <div
                key={key}
                className="list-item"
                onClick={() => addCondition(key)}
              >
                {label}
              </div>
            ))}
        </div>
      </BottomSheet>

      {/* Dice Roll Overlay */}
      {diceRoll && (
        <DiceRoller
          notation={diceRoll.notation}
          label={diceRoll.label}
          onClose={() => setDiceRoll(null)}
        />
      )}
    </div>
  );
}
