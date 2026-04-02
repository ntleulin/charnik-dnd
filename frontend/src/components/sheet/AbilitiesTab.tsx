import { useState } from 'react';
import type { Character, AbilityScores } from '../../types/character';
import { ABILITY_NAMES, SKILLS } from '../../types/character';
import {
  abilityModifier,
  proficiencyBonus,
  totalLevel,
  formatModifier,
} from '../../utils/calculator';
import { useTelegram } from '../../telegram/init';
import DiceRoller from '../DiceRoller';
import BottomSheet from '../BottomSheet';

interface AbilitiesTabProps {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

type AbilityKey = keyof AbilityScores;

export default function AbilitiesTab({ character, onChange }: AbilitiesTabProps) {
  const { hapticSelect } = useTelegram();
  const [diceRoll, setDiceRoll] = useState<{ notation: string; label: string } | null>(null);
  const [editingAbility, setEditingAbility] = useState<AbilityKey | null>(null);
  const [abilityInput, setAbilityInput] = useState('');

  const lvl = totalLevel(character);
  const profBonus = proficiencyBonus(lvl);

  const abilities: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  function rollAbilityCheck(ability: AbilityKey) {
    const mod = abilityModifier(character.abilityScores[ability]);
    setDiceRoll({
      notation: `1d20${mod >= 0 ? '+' + mod : String(mod)}`,
      label: ABILITY_NAMES[ability].ru,
    });
  }

  function rollSave(ability: AbilityKey) {
    let mod = abilityModifier(character.abilityScores[ability]);
    if (character.savingThrowProficiencies.includes(ability)) {
      mod += profBonus;
    }
    setDiceRoll({
      notation: `1d20${mod >= 0 ? '+' + mod : String(mod)}`,
      label: `Спасбросок ${ABILITY_NAMES[ability].short}`,
    });
  }

  function rollSkill(skillKey: string) {
    const skill = SKILLS[skillKey];
    let mod = abilityModifier(character.abilityScores[skill.ability]);
    const profCount = character.skillProficiencies.filter(s => s === skillKey).length;
    if (profCount >= 2) {
      mod += profBonus * 2; // expertise
    } else if (profCount >= 1) {
      mod += profBonus;
    }
    setDiceRoll({
      notation: `1d20${mod >= 0 ? '+' + mod : String(mod)}`,
      label: skill.ru,
    });
  }

  function cycleSkillProficiency(skillKey: string) {
    hapticSelect();
    const current = character.skillProficiencies.filter(s => s === skillKey).length;
    let newProfs = character.skillProficiencies.filter(s => s !== skillKey);
    if (current === 0) {
      newProfs.push(skillKey); // proficient
    } else if (current === 1) {
      newProfs.push(skillKey, skillKey); // expertise
    }
    // current >= 2 -> none (already filtered out)
    onChange({ skillProficiencies: newProfs });
  }

  function toggleSaveProficiency(ability: AbilityKey) {
    hapticSelect();
    const has = character.savingThrowProficiencies.includes(ability);
    onChange({
      savingThrowProficiencies: has
        ? character.savingThrowProficiencies.filter(s => s !== ability)
        : [...character.savingThrowProficiencies, ability],
    });
  }

  function saveAbilityEdit() {
    if (editingAbility) {
      const val = parseInt(abilityInput);
      if (!isNaN(val) && val >= 1 && val <= 30) {
        onChange({
          abilityScores: { ...character.abilityScores, [editingAbility]: val },
        });
      }
    }
    setEditingAbility(null);
  }

  function getSkillMod(skillKey: string): number {
    const skill = SKILLS[skillKey];
    let mod = abilityModifier(character.abilityScores[skill.ability]);
    const profCount = character.skillProficiencies.filter(s => s === skillKey).length;
    if (profCount >= 2) mod += profBonus * 2;
    else if (profCount >= 1) mod += profBonus;
    return mod;
  }

  function getSaveMod(ability: AbilityKey): number {
    let mod = abilityModifier(character.abilityScores[ability]);
    if (character.savingThrowProficiencies.includes(ability)) {
      mod += profBonus;
    }
    return mod;
  }

  const profDot = (count: number) => {
    if (count >= 2) return '◆◆';
    if (count === 1) return '◆';
    return '○';
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 8 }}>
      {/* Ability Scores Grid */}
      <div className="section">
        <div className="section-title">Характеристики</div>
        <div className="stat-grid">
          {abilities.map(ab => {
            const score = character.abilityScores[ab];
            const mod = abilityModifier(score);
            return (
              <div key={ab} className="stat-card" style={{ position: 'relative' }}>
                <div className="stat-label">{ABILITY_NAMES[ab].short}</div>
                <div
                  className="stat-value"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAbilityInput(String(score));
                    setEditingAbility(ab);
                  }}
                >
                  {score}
                </div>
                <div
                  className="stat-mod"
                  onClick={(e) => {
                    e.stopPropagation();
                    rollAbilityCheck(ab);
                  }}
                >
                  {formatModifier(mod)}
                </div>
                {character.savingThrowProficiencies.includes(ab) && (
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    right: 6,
                    fontSize: 8,
                    color: 'var(--button-color)',
                  }}>
                    ◆
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Saving Throws */}
      <div className="section">
        <div className="section-title">Спасброски</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {abilities.map(ab => {
            const hasProficiency = character.savingThrowProficiencies.includes(ab);
            const mod = getSaveMod(ab);
            return (
              <div
                key={`save-${ab}`}
                className="list-item"
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      cursor: 'pointer',
                      color: hasProficiency ? 'var(--button-color)' : 'var(--hint-color)',
                      fontSize: 14,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveProficiency(ab);
                    }}
                  >
                    {hasProficiency ? '◆' : '○'}
                  </span>
                  <span style={{ fontSize: 14 }}>{ABILITY_NAMES[ab].ru}</span>
                </div>
                <span
                  style={{ fontWeight: 700, color: 'var(--button-color)', cursor: 'pointer' }}
                  onClick={() => rollSave(ab)}
                >
                  {formatModifier(mod)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="section">
        <div className="section-title">Навыки</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {Object.entries(SKILLS)
            .sort((a, b) => a[1].ru.localeCompare(b[1].ru, 'ru'))
            .map(([key, skill]) => {
              const profCount = character.skillProficiencies.filter(s => s === key).length;
              const mod = getSkillMod(key);
              return (
                <div
                  key={key}
                  className="list-item"
                  style={{ justifyContent: 'space-between', padding: '8px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        cursor: 'pointer',
                        color: profCount > 0 ? 'var(--button-color)' : 'var(--hint-color)',
                        fontSize: 12,
                        minWidth: 20,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleSkillProficiency(key);
                      }}
                    >
                      {profDot(profCount)}
                    </span>
                    <div>
                      <span style={{ fontSize: 14 }}>{skill.ru}</span>
                      <span style={{ fontSize: 11, color: 'var(--hint-color)', marginLeft: 4 }}>
                        {ABILITY_NAMES[skill.ability].short}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{ fontWeight: 700, color: 'var(--button-color)', cursor: 'pointer', fontSize: 14 }}
                    onClick={() => rollSkill(key)}
                  >
                    {formatModifier(mod)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Languages */}
      {character.languages.length > 0 && (
        <div className="section">
          <div className="section-title">Языки</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {character.languages.map(lang => (
              <div key={lang} className="chip">{lang}</div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Proficiencies */}
      {character.toolProficiencies.length > 0 && (
        <div className="section">
          <div className="section-title">Владение инструментами</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {character.toolProficiencies.map(tool => (
              <div key={tool} className="chip">{tool}</div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Ability Bottom Sheet */}
      <BottomSheet
        isOpen={editingAbility !== null}
        onClose={() => setEditingAbility(null)}
        title={editingAbility ? `${ABILITY_NAMES[editingAbility].ru}` : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="number"
            min={1}
            max={30}
            value={abilityInput}
            onChange={e => setAbilityInput(e.target.value)}
            autoFocus
            style={{ textAlign: 'center', fontSize: 32, fontWeight: 700 }}
          />
          <div style={{ textAlign: 'center', color: 'var(--hint-color)', fontSize: 14 }}>
            Модификатор: {editingAbility && formatModifier(abilityModifier(parseInt(abilityInput) || 10))}
          </div>
          <button className="btn btn--primary btn--full" onClick={saveAbilityEdit}>
            Сохранить
          </button>
        </div>
      </BottomSheet>

      {/* Dice Roller */}
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
