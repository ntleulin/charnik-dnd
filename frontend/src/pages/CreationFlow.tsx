import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AbilityScores, Character } from '../types/character';
import { ABILITY_NAMES, SKILLS } from '../types/character';
import { useClasses, useSpecies, useBackgrounds } from '../hooks/useGameData';
import { abilityModifier, formatModifier, proficiencyBonus, calculateMaxHp } from '../utils/calculator';
import { rollAbilityScore } from '../utils/dice';
import { useBackButton, useTelegram } from '../telegram/init';
import StepIndicator from '../components/StepIndicator';
import SpeciesCard from '../components/SpeciesCard';
import BackgroundCard from '../components/BackgroundCard';

const STEP_LABELS = ['Имя', 'Вид', 'Происхождение', 'Характеристики', 'Класс', 'Обзор'];
const TOTAL_STEPS = 6;

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
const POINT_BUY_TOTAL = 27;

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

interface ClassSelection {
  classId: string;
  level: number;
  subclassId?: string;
  selectedSkills: string[];
}

interface BackgroundChoicesState {
  abilityMode: 'two' | 'three';
  abilityPlus2?: string;
  abilityPlus1?: string;
  language?: string;
}

interface DiceResults {
  [key: string]: { rolls: number[]; dropped?: number[]; total: number } | undefined;
}

export default function CreationFlow() {
  const navigate = useNavigate();
  const { haptic, hapticSuccess, hapticSelect } = useTelegram();
  const { data: speciesList } = useSpecies();
  const { data: backgroundsList } = useBackgrounds();
  const { data: classesMap } = useClasses();

  // --- wizard state ---
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0: Name
  const [name, setName] = useState('');

  // Step 1: Species
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [speciesChoices, setSpeciesChoices] = useState<Record<string, string>>({});
  const [sizeChoice, setSizeChoice] = useState('');

  // Step 2: Background
  const [selectedBackground, setSelectedBackground] = useState('');
  const [backgroundChoices, setBackgroundChoices] = useState<BackgroundChoicesState>({
    abilityMode: 'two',
  });

  // Step 3: Ability Scores
  const [abilityScores, setAbilityScores] = useState<AbilityScores>({
    str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8,
  });
  const [abilityMethod, setAbilityMethod] = useState<'pointbuy' | 'standard' | 'roll'>('pointbuy');
  const [diceResults, setDiceResults] = useState<DiceResults>({});
  const [rollingAbility, setRollingAbility] = useState<string | null>(null);

  // Step 4: Class
  const [classSelections, setClassSelections] = useState<ClassSelection[]>([
    { classId: '', level: 1, selectedSkills: [] },
  ]);

  // --- navigation ---
  const goNext = useCallback(() => {
    hapic();
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      haptic();
      setCurrentStep((s) => s - 1);
    } else {
      navigate('/');
    }
  }, [currentStep, navigate]);

  useBackButton(true, goBack);

  // fix typo helper
  function hapic() { haptic(); }

  // --- validation ---
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 0:
        return name.trim().length > 0;
      case 1: {
        if (!selectedSpecies) return false;
        const sp = speciesList?.find((s) => s.id === selectedSpecies);
        if (!sp) return false;
        // Check all choice traits have selections
        for (const trait of sp.traits) {
          if (trait.choices && trait.choices.length > 0 && !speciesChoices[trait.id]) {
            return false;
          }
        }
        // Size choice
        if (sp.sizeOptions && sp.sizeOptions.length > 1 && !sizeChoice) {
          return false;
        }
        return true;
      }
      case 2: {
        if (!selectedBackground) return false;
        const bg = backgroundsList?.find((b) => b.id === selectedBackground);
        if (!bg) return false;
        if (backgroundChoices.abilityMode === 'two') {
          if (!backgroundChoices.abilityPlus2 || !backgroundChoices.abilityPlus1) return false;
        }
        if (!backgroundChoices.language) return false;
        return true;
      }
      case 3:
        return true; // ability scores always have values
      case 4: {
        if (classSelections.length === 0) return false;
        for (const sel of classSelections) {
          if (!sel.classId) return false;
          const cls = classesMap?.[sel.classId];
          if (!cls) return false;
          if (sel.level >= cls.subclassLevel && !sel.subclassId) return false;
          if (sel.selectedSkills.length < cls.skillChoice.count) return false;
        }
        return true;
      }
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, name, selectedSpecies, speciesList, speciesChoices, sizeChoice,
    selectedBackground, backgroundsList, backgroundChoices, classSelections, classesMap]);

  // --- Point Buy logic ---
  const pointsUsed = useMemo(() => {
    return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COSTS[abilityScores[k]] ?? 0), 0);
  }, [abilityScores]);

  const pointsRemaining = POINT_BUY_TOTAL - pointsUsed;

  const changeAbility = (key: keyof AbilityScores, delta: number) => {
    hapicSelect();
    setAbilityScores((prev) => {
      const newVal = prev[key] + delta;
      if (newVal < 8 || newVal > 15) return prev;
      const newScores = { ...prev, [key]: newVal };
      const newCost = ABILITY_KEYS.reduce(
        (sum, k) => sum + (POINT_BUY_COSTS[newScores[k]] ?? 0),
        0,
      );
      if (newCost > POINT_BUY_TOTAL) return prev;
      return newScores;
    });
  };

  function hapicSelect() { hapticSelect(); }

  const applyStandardArray = () => {
    haptic('medium');
    setAbilityMethod('standard');
    const shuffled = [...STANDARD_ARRAY];
    setAbilityScores({
      str: shuffled[0], dex: shuffled[1], con: shuffled[2],
      int: shuffled[3], wis: shuffled[4], cha: shuffled[5],
    });
  };

  const rollAllAbilities = () => {
    haptic('medium');
    setAbilityMethod('roll');
    const newScores: Partial<AbilityScores> = {};
    const newDice: DiceResults = {};

    for (const key of ABILITY_KEYS) {
      const result = rollAbilityScore();
      newScores[key] = result.total;
      newDice[key] = { rolls: result.rolls, dropped: result.dropped, total: result.total };
    }

    setDiceResults(newDice);
    setAbilityScores(newScores as AbilityScores);

    // Animate each one
    setRollingAbility('all');
    setTimeout(() => setRollingAbility(null), 600);
  };

  const switchToPointBuy = () => {
    haptic();
    setAbilityMethod('pointbuy');
    setAbilityScores({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    setDiceResults({});
  };

  // --- Final ability scores with background bonuses ---
  const finalAbilityScores = useMemo((): AbilityScores => {
    const scores = { ...abilityScores };
    if (!selectedBackground) return scores;

    const bg = backgroundsList?.find((b) => b.id === selectedBackground);
    if (!bg) return scores;

    if (backgroundChoices.abilityMode === 'two') {
      if (backgroundChoices.abilityPlus2) {
        const k = backgroundChoices.abilityPlus2 as keyof AbilityScores;
        scores[k] = (scores[k] || 0) + 2;
      }
      if (backgroundChoices.abilityPlus1) {
        const k = backgroundChoices.abilityPlus1 as keyof AbilityScores;
        scores[k] = (scores[k] || 0) + 1;
      }
    } else {
      for (const a of bg.abilityScoreOptions) {
        const k = a as keyof AbilityScores;
        scores[k] = (scores[k] || 0) + 1;
      }
    }
    return scores;
  }, [abilityScores, selectedBackground, backgroundsList, backgroundChoices]);

  // --- Class selection handlers ---
  const updateClassSelection = (index: number, updates: Partial<ClassSelection>) => {
    hapticSelect();
    setClassSelections((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      // If class changed, reset subclass and skills
      if (updates.classId && updates.classId !== prev[index].classId) {
        copy[index].subclassId = undefined;
        copy[index].selectedSkills = [];
      }
      // If level dropped below subclassLevel, remove subclass
      if (updates.level !== undefined) {
        const cls = classesMap?.[copy[index].classId];
        if (cls && updates.level < cls.subclassLevel) {
          copy[index].subclassId = undefined;
        }
      }
      return copy;
    });
  };

  const toggleClassSkill = (classIndex: number, skillId: string) => {
    hapticSelect();
    setClassSelections((prev) => {
      const copy = [...prev];
      const sel = { ...copy[classIndex] };
      const cls = classesMap?.[sel.classId];
      if (!cls) return prev;

      if (sel.selectedSkills.includes(skillId)) {
        sel.selectedSkills = sel.selectedSkills.filter((s) => s !== skillId);
      } else {
        if (sel.selectedSkills.length >= cls.skillChoice.count) return prev;
        sel.selectedSkills = [...sel.selectedSkills, skillId];
      }
      copy[classIndex] = sel;
      return copy;
    });
  };

  // --- Create character ---
  const createCharacter = () => {
    hapticSuccess();
    const sp = speciesList?.find((s) => s.id === selectedSpecies);
    const bg = backgroundsList?.find((b) => b.id === selectedBackground);

    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      speciesId: selectedSpecies,
      backgroundId: selectedBackground,
      abilityScores: finalAbilityScores,
      classes: classSelections.map((s) => ({
        classId: s.classId,
        level: s.level,
        subclassId: s.subclassId,
      })),
      currentHp: 0,
      maxHp: 0,
      tempHp: 0,
      speed: sp?.speed || 30,
      skillProficiencies: [
        ...(bg?.skillProficiencies || []),
        ...classSelections.flatMap((s) => s.selectedSkills),
      ],
      savingThrowProficiencies: classSelections.length > 0 && classesMap
        ? classesMap[classSelections[0].classId]?.savingThrows || []
        : [],
      featIds: bg?.originFeat ? [bg.originFeat] : [],
      spellSlots: {},
      knownSpells: [],
      preparedSpells: [],
      inventory: [],
      currency: { cp: 0, sp: 0, gp: bg?.startingGold || 0, ep: 0, pp: 0 },
      featureUsage: {},
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      speciesChoices,
      backgroundChoices: {
        abilityMode: backgroundChoices.abilityMode,
        ...(backgroundChoices.abilityPlus2 ? { abilityPlus2: backgroundChoices.abilityPlus2 } : {}),
        ...(backgroundChoices.abilityPlus1 ? { abilityPlus1: backgroundChoices.abilityPlus1 } : {}),
      },
      sizeChoice: sizeChoice || sp?.size,
      languages: ['Общий', ...(backgroundChoices.language ? [backgroundChoices.language] : [])],
      toolProficiencies: bg?.toolProficiency ? [bg.toolProficiency] : [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calculate maxHp
    if (classesMap) {
      character.maxHp = calculateMaxHp(character, classesMap);
      character.currentHp = character.maxHp;
    }

    // Save to localStorage
    const stored = localStorage.getItem('dnd_characters');
    const chars: Character[] = stored ? JSON.parse(stored) : [];
    chars.push(character);
    localStorage.setItem('dnd_characters', JSON.stringify(chars));

    navigate('/');
  };

  // --- Render helpers ---
  const renderNameStep = () => (
    <div className="creation-step fade-in">
      <div className="section">
        <div className="section-title">Как зовут вашего персонажа?</div>
        <input
          className="input"
          placeholder="Введите имя..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={50}
        />
      </div>
    </div>
  );

  const renderSpeciesStep = () => (
    <div className="creation-step fade-in">
      <div className="section">
        <div className="section-title">Выберите вид</div>
        {speciesList?.map((sp) => (
          <SpeciesCard
            key={sp.id}
            species={sp}
            isSelected={selectedSpecies === sp.id}
            onSelect={(id) => {
              setSelectedSpecies(id);
              setSpeciesChoices({});
              const s = speciesList.find((x) => x.id === id);
              if (s?.sizeOptions?.[0]) setSizeChoice(s.sizeOptions[0]);
              else if (s) setSizeChoice(s.size);
            }}
            speciesChoices={speciesChoices}
            onChoicesChanged={setSpeciesChoices}
            sizeChoice={sizeChoice}
            onSizeChanged={setSizeChoice}
          />
        ))}
      </div>
    </div>
  );

  const renderBackgroundStep = () => (
    <div className="creation-step fade-in">
      <div className="section">
        <div className="section-title">Выберите происхождение</div>
        {backgroundsList?.map((bg) => (
          <BackgroundCard
            key={bg.id}
            background={bg}
            isSelected={selectedBackground === bg.id}
            onSelect={(id) => {
              setSelectedBackground(id);
              setBackgroundChoices({ abilityMode: 'two' });
            }}
            backgroundChoices={backgroundChoices}
            onChoicesChanged={setBackgroundChoices}
          />
        ))}
      </div>
    </div>
  );

  const renderAbilityStep = () => (
    <div className="creation-step fade-in">
      <div className="section">
        <div className="section-title">Метод определения</div>
        <div className="ability-methods">
          <button
            className={`btn btn--sm ${abilityMethod === 'pointbuy' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={switchToPointBuy}
          >
            Покупка очков
          </button>
          <button
            className={`btn btn--sm ${abilityMethod === 'standard' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={applyStandardArray}
          >
            Стандартный набор
          </button>
          <button
            className={`btn btn--sm ${abilityMethod === 'roll' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={rollAllAbilities}
          >
            Бросить 4d6
          </button>
        </div>
      </div>

      {abilityMethod === 'pointbuy' && (
        <div className="section">
          <div className="section-title">
            Осталось очков: <span className="ability-points-badge">{pointsRemaining}</span>
          </div>
        </div>
      )}

      <div className="stat-grid">
        {ABILITY_KEYS.map((key) => {
          const score = abilityScores[key];
          const mod = abilityModifier(score);
          const dr = diceResults[key];

          return (
            <div
              key={key}
              className={`stat-card ability-stat-card ${rollingAbility ? 'ability-stat-card--rolling' : ''}`}
            >
              <div className="stat-label">{ABILITY_NAMES[key].short}</div>
              <div className="stat-value">{score}</div>
              <div className="stat-mod">{formatModifier(mod)}</div>

              {abilityMethod === 'pointbuy' && (
                <div className="ability-controls">
                  <button
                    className="ability-btn"
                    disabled={score <= 8}
                    onClick={() => changeAbility(key, -1)}
                  >
                    -
                  </button>
                  <span className="ability-cost">{POINT_BUY_COSTS[score] ?? 0}</span>
                  <button
                    className="ability-btn"
                    disabled={score >= 15 || pointsRemaining <= 0}
                    onClick={() => changeAbility(key, 1)}
                  >
                    +
                  </button>
                </div>
              )}

              {abilityMethod === 'roll' && dr && (
                <div className="ability-dice-info">
                  {dr.rolls.map((r, i) => (
                    <span
                      key={i}
                      className={`ability-die ${dr.dropped?.includes(r) && i === dr.rolls.lastIndexOf(r) ? 'ability-die--dropped' : ''}`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderClassStep = () => {
    if (!classesMap) return null;
    const classList = Object.values(classesMap);

    return (
      <div className="creation-step fade-in">
        {classSelections.map((sel, idx) => {
          const cls = sel.classId ? classesMap[sel.classId] : null;

          return (
            <div key={idx} className="section class-selection-section">
              <div className="section-title">
                {classSelections.length > 1 ? `Класс ${idx + 1}` : 'Класс'}
              </div>

              {/* Class picker */}
              <select
                className="input"
                value={sel.classId}
                onChange={(e) => updateClassSelection(idx, { classId: e.target.value, level: 1 })}
              >
                <option value="">Выберите класс...</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameRu}</option>
                ))}
              </select>

              {cls && (
                <div className="class-details fade-in">
                  <div className="class-info-chips">
                    <span className="chip">Кость хитов: {cls.hitDie}</span>
                    <span className="chip chip--outline">
                      Спасброски: {cls.savingThrows.map((s) => ABILITY_NAMES[s as keyof AbilityScores]?.short || s).join(', ')}
                    </span>
                  </div>

                  <div className="class-desc">{cls.descriptionRu}</div>

                  {/* Level slider */}
                  <div className="class-level-section">
                    <div className="class-level-header">
                      <span className="section-title" style={{ padding: 0 }}>Уровень</span>
                      <span className="badge">{sel.level}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={sel.level}
                      className="class-level-slider"
                      onChange={(e) => updateClassSelection(idx, { level: parseInt(e.target.value) })}
                    />
                    <div className="class-level-labels">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20</span>
                    </div>
                  </div>

                  {/* Features for selected level */}
                  <div className="class-features-section">
                    <div className="section-title">Умения (до {sel.level} ур.)</div>
                    <div className="class-features-list">
                      {Object.entries(cls.levels)
                        .filter(([lvl]) => parseInt(lvl) <= sel.level)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([lvl, data]) => (
                          <div key={lvl} className="class-feature-row">
                            <span className="class-feature-level">{lvl} ур.</span>
                            <span className="class-feature-names">
                              {data.features
                                .map((fId) => {
                                  const feat = cls.features?.[fId];
                                  return feat?.nameRu || fId;
                                })
                                .join(', ')}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Subclass */}
                  {sel.level >= cls.subclassLevel && cls.subclasses.length > 0 && (
                    <div className="class-subclass-section">
                      <div className="section-title">Подкласс</div>
                      <select
                        className="input"
                        value={sel.subclassId || ''}
                        onChange={(e) => updateClassSelection(idx, { subclassId: e.target.value })}
                      >
                        <option value="">Выберите подкласс...</option>
                        {cls.subclasses.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.nameRu}</option>
                        ))}
                      </select>
                      {sel.subclassId && (
                        <div className="class-subclass-desc">
                          {cls.subclasses.find((sc) => sc.id === sel.subclassId)?.descriptionRu}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skill proficiencies */}
                  <div className="class-skills-section">
                    <div className="section-title">
                      Навыки (выберите {cls.skillChoice.count})
                    </div>
                    <div className="class-skills-grid">
                      {cls.skillChoice.from.map((skillId) => {
                        const skill = SKILLS[skillId];
                        const isChosen = sel.selectedSkills.includes(skillId);
                        const atMax = sel.selectedSkills.length >= cls.skillChoice.count;
                        return (
                          <button
                            key={skillId}
                            className={`chip class-skill-chip ${isChosen ? 'chip--accent' : 'chip--outline'} ${!isChosen && atMax ? 'class-skill-chip--disabled' : ''}`}
                            onClick={() => toggleClassSkill(idx, skillId)}
                            disabled={!isChosen && atMax}
                          >
                            {skill?.ru || skillId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSummaryStep = () => {
    const sp = speciesList?.find((s) => s.id === selectedSpecies);
    const bg = backgroundsList?.find((b) => b.id === selectedBackground);
    const totalLvl = classSelections.reduce((s, c) => s + c.level, 0);
    const profBonus = proficiencyBonus(totalLvl);

    return (
      <div className="creation-step fade-in">
        <div className="summary-header">
          <div className="summary-name">{name}</div>
          <div className="summary-subtitle">
            {sp?.nameRu} | {bg?.nameRu} | Ур. {totalLvl}
          </div>
        </div>

        {/* Classes */}
        <div className="section">
          <div className="section-title">Классы</div>
          {classSelections.map((sel, i) => {
            const cls = classesMap?.[sel.classId];
            const sc = cls?.subclasses.find((s) => s.id === sel.subclassId);
            return (
              <div key={i} className="chip chip--accent" style={{ marginRight: 4, marginBottom: 4 }}>
                {cls?.nameRu} {sel.level}{sc ? ` (${sc.nameRu})` : ''}
              </div>
            );
          })}
        </div>

        {/* Ability Scores */}
        <div className="section">
          <div className="section-title">Итоговые характеристики</div>
          <div className="stat-grid">
            {ABILITY_KEYS.map((key) => {
              const score = finalAbilityScores[key];
              const mod = abilityModifier(score);
              return (
                <div key={key} className="stat-card">
                  <div className="stat-label">{ABILITY_NAMES[key].short}</div>
                  <div className="stat-value">{score}</div>
                  <div className="stat-mod">{formatModifier(mod)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proficiency & Stats */}
        <div className="section">
          <div className="section-title">Параметры</div>
          <div className="summary-params">
            <div className="summary-param">
              <span className="summary-param-label">Бонус мастерства</span>
              <span className="summary-param-value">{formatModifier(profBonus)}</span>
            </div>
            <div className="summary-param">
              <span className="summary-param-label">Скорость</span>
              <span className="summary-param-value">{sp?.speed || 30} фт.</span>
            </div>
            <div className="summary-param">
              <span className="summary-param-label">Размер</span>
              <span className="summary-param-value">{sizeChoice || sp?.size}</span>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="section">
          <div className="section-title">Владение навыками</div>
          <div className="summary-skills">
            {[
              ...(bg?.skillProficiencies || []),
              ...classSelections.flatMap((s) => s.selectedSkills),
            ].map((s) => (
              <span key={s} className="chip">{SKILLS[s]?.ru || s}</span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="section">
          <div className="section-title">Языки</div>
          <div className="summary-skills">
            <span className="chip">Общий</span>
            {backgroundChoices.language && <span className="chip">{backgroundChoices.language}</span>}
          </div>
        </div>

        {/* Species choices */}
        {Object.keys(speciesChoices).length > 0 && sp && (
          <div className="section">
            <div className="section-title">Особенности вида</div>
            {Object.entries(speciesChoices).map(([traitId, choiceId]) => {
              const trait = sp.traits.find((t) => t.id === traitId);
              const choice = trait?.choices?.find((c) => c.id === choiceId);
              return (
                <div key={traitId} className="summary-param">
                  <span className="summary-param-label">{trait?.nameRu}</span>
                  <span className="summary-param-value">{choice?.nameRu}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- Render current step ---
  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderNameStep();
      case 1: return renderSpeciesStep();
      case 2: return renderBackgroundStep();
      case 3: return renderAbilityStep();
      case 4: return renderClassStep();
      case 5: return renderSummaryStep();
      default: return null;
    }
  };

  return (
    <div className="page creation-flow">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        labels={STEP_LABELS}
      />

      <div className="creation-flow__content">{renderStep()}</div>

      {/* Bottom navigation */}
      <div className="creation-flow__nav">
        {currentStep < TOTAL_STEPS - 1 ? (
          <button
            className="btn btn--primary btn--full"
            disabled={!isStepValid}
            onClick={goNext}
          >
            Далее
          </button>
        ) : (
          <button
            className="btn btn--primary btn--full"
            onClick={createCharacter}
          >
            Создать персонажа
          </button>
        )}
      </div>

      <style>{`
        .creation-flow {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-bottom: 80px;
        }
        .creation-flow__content {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .creation-flow__nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          background: var(--bg-color);
          border-top: 1px solid var(--border-color);
          z-index: 50;
        }
        .creation-flow__nav .btn:disabled {
          opacity: 0.4;
          pointer-events: none;
        }

        .creation-step {
          animation: fadeIn 0.3s ease;
        }

        /* Ability step */
        .ability-methods {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ability-points-badge {
          color: var(--button-color);
          font-weight: 700;
        }
        .ability-stat-card {
          position: relative;
        }
        .ability-stat-card--rolling {
          animation: diceAppear 0.4s ease;
        }
        .ability-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        .ability-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid var(--border-color);
          background: var(--secondary-bg);
          color: var(--text-color);
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ability-btn:active {
          transform: scale(0.9);
          background: var(--button-color);
          color: var(--button-text-color);
          border-color: var(--button-color);
        }
        .ability-btn:disabled {
          opacity: 0.3;
          pointer-events: none;
        }
        .ability-cost {
          font-size: 11px;
          color: var(--hint-color);
          font-weight: 600;
          min-width: 14px;
          text-align: center;
        }
        .ability-dice-info {
          display: flex;
          gap: 3px;
          margin-top: 4px;
        }
        .ability-die {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: var(--secondary-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .ability-die--dropped {
          opacity: 0.3;
          text-decoration: line-through;
        }

        /* Class step */
        .class-selection-section {
          margin-bottom: 16px;
        }
        .class-details {
          margin-top: 12px;
        }
        .class-info-chips {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .class-desc {
          font-size: 13px;
          color: var(--hint-color);
          line-height: 1.4;
          margin-bottom: 12px;
        }
        .class-level-section {
          margin-bottom: 16px;
        }
        .class-level-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .class-level-slider {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--secondary-bg);
          border-radius: 2px;
          outline: none;
        }
        .class-level-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--button-color);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .class-level-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--hint-color);
          margin-top: 4px;
          padding: 0 2px;
        }
        .class-features-section {
          margin-bottom: 12px;
        }
        .class-features-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .class-feature-row {
          display: flex;
          gap: 8px;
          font-size: 13px;
          padding: 4px 0;
          align-items: baseline;
        }
        .class-feature-level {
          font-weight: 700;
          color: var(--button-color);
          min-width: 40px;
          flex-shrink: 0;
        }
        .class-feature-names {
          color: var(--text-color);
          line-height: 1.3;
        }
        .class-subclass-section {
          margin-bottom: 12px;
        }
        .class-subclass-desc {
          font-size: 13px;
          color: var(--hint-color);
          margin-top: 8px;
          line-height: 1.4;
        }
        .class-skills-section {
          margin-bottom: 8px;
        }
        .class-skills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .class-skill-chip {
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          font-family: inherit;
        }
        .class-skill-chip:active {
          transform: scale(0.95);
        }
        .class-skill-chip--disabled {
          opacity: 0.35;
          pointer-events: none;
        }

        /* Summary step */
        .summary-header {
          text-align: center;
          margin-bottom: 20px;
          padding: 16px;
          background: var(--section-bg);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .summary-name {
          font-size: 24px;
          font-weight: 800;
        }
        .summary-subtitle {
          font-size: 14px;
          color: var(--hint-color);
          margin-top: 4px;
        }
        .summary-params {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .summary-param {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--section-bg);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .summary-param-label {
          font-size: 13px;
          color: var(--hint-color);
        }
        .summary-param-value {
          font-size: 14px;
          font-weight: 700;
        }
        .summary-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}
