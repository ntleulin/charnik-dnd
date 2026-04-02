import { useState } from 'react';
import type { Background } from '../types/game-data';
import { ABILITY_NAMES, SKILLS, type AbilityScores } from '../types/character';
import { useTelegram } from '../telegram/init';

const ALL_LANGUAGES = [
  'Общий', 'Дварфийский', 'Эльфийский', 'Гигантский', 'Гномий',
  'Гоблинский', 'Халфлингский', 'Орочий', 'Абиссальный', 'Небесный',
  'Драконий', 'Глубинная речь', 'Инфернальный', 'Первозданный',
  'Сильванский', 'Подземный',
];

interface BackgroundChoices {
  abilityMode: 'two' | 'three';
  abilityPlus2?: string;
  abilityPlus1?: string;
  language?: string;
}

interface BackgroundCardProps {
  background: Background;
  isSelected: boolean;
  onSelect: (id: string) => void;
  backgroundChoices: BackgroundChoices;
  onChoicesChanged: (choices: BackgroundChoices) => void;
}

export default function BackgroundCard({
  background,
  isSelected,
  onSelect,
  backgroundChoices,
  onChoicesChanged,
}: BackgroundCardProps) {
  const { hapticSelect } = useTelegram();
  const [langOpen, setLangOpen] = useState(false);

  const handleSelect = () => {
    hapticSelect();
    onSelect(background.id);
  };

  const abilityOpts = background.abilityScoreOptions;

  const handleModeChange = (mode: 'two' | 'three') => {
    hapticSelect();
    onChoicesChanged({
      ...backgroundChoices,
      abilityMode: mode,
      abilityPlus2: undefined,
      abilityPlus1: undefined,
    });
  };

  const handlePlus2 = (val: string) => {
    hapticSelect();
    const newChoices = { ...backgroundChoices, abilityPlus2: val };
    // If +1 is same as new +2, clear it
    if (newChoices.abilityPlus1 === val) {
      newChoices.abilityPlus1 = undefined;
    }
    onChoicesChanged(newChoices);
  };

  const handlePlus1 = (val: string) => {
    hapticSelect();
    onChoicesChanged({ ...backgroundChoices, abilityPlus1: val });
  };

  const handleLanguage = (lang: string) => {
    hapticSelect();
    setLangOpen(false);
    onChoicesChanged({ ...backgroundChoices, language: lang });
  };

  const skillNames = background.skillProficiencies
    .map((s) => SKILLS[s]?.ru || s)
    .join(', ');

  const abilityLabel = (key: string) =>
    ABILITY_NAMES[key as keyof AbilityScores]?.ru || key;

  return (
    <div
      className={`card bg-card ${isSelected ? 'bg-card--selected' : ''}`}
      onClick={!isSelected ? handleSelect : undefined}
    >
      <div className="card-body">
        <div className="bg-card__header">
          <div className="bg-card__name">{background.nameRu}</div>
        </div>

        <div className="bg-card__info-row">
          <span className="chip">{skillNames}</span>
          <span className="chip chip--outline">{background.toolProficiency}</span>
        </div>

        {!isSelected && (
          <div className="bg-card__desc">{background.descriptionRu}</div>
        )}

        {isSelected && (
          <div className="bg-card__details fade-in">
            <div className="bg-card__desc">{background.descriptionRu}</div>

            {/* Feat info */}
            <div className="bg-card__feat-info">
              <span className="chip chip--accent">
                Черта: {background.originFeat}
              </span>
            </div>

            {/* Ability Score Distribution */}
            <div className="bg-card__section">
              <div className="section-title">Распределение характеристик</div>
              <div className="segmented-control" style={{ marginBottom: 12 }}>
                <button
                  className={`segmented-control__btn ${
                    backgroundChoices.abilityMode === 'two' ? 'segmented-control__btn--active' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeChange('two');
                  }}
                >
                  +2 / +1
                </button>
                <button
                  className={`segmented-control__btn ${
                    backgroundChoices.abilityMode === 'three' ? 'segmented-control__btn--active' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeChange('three');
                  }}
                >
                  +1 / +1 / +1
                </button>
              </div>

              {backgroundChoices.abilityMode === 'two' ? (
                <div className="bg-card__ability-selects">
                  {/* +2 picker */}
                  <div className="bg-card__select-group">
                    <label className="bg-card__select-label">+2</label>
                    <select
                      className="input bg-card__select"
                      value={backgroundChoices.abilityPlus2 || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handlePlus2(e.target.value)}
                    >
                      <option value="">Выберите...</option>
                      {abilityOpts.map((a) => (
                        <option key={a} value={a}>
                          {abilityLabel(a)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* +1 picker */}
                  <div className="bg-card__select-group">
                    <label className="bg-card__select-label">+1</label>
                    <select
                      className="input bg-card__select"
                      value={backgroundChoices.abilityPlus1 || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handlePlus1(e.target.value)}
                    >
                      <option value="">Выберите...</option>
                      {abilityOpts
                        .filter((a) => a !== backgroundChoices.abilityPlus2)
                        .map((a) => (
                          <option key={a} value={a}>
                            {abilityLabel(a)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-card__three-info">
                  {abilityOpts.map((a) => (
                    <span key={a} className="chip chip--accent">
                      {abilityLabel(a)} +1
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Language picker */}
            <div className="bg-card__section">
              <div className="section-title">Дополнительный язык</div>
              <div
                className="input bg-card__lang-picker"
                onClick={(e) => {
                  e.stopPropagation();
                  setLangOpen(!langOpen);
                }}
              >
                {backgroundChoices.language || 'Выберите язык...'}
              </div>
              {langOpen && (
                <div className="bg-card__lang-list fade-in">
                  {ALL_LANGUAGES.map((lang) => (
                    <div
                      key={lang}
                      className={`bg-card__lang-item ${
                        backgroundChoices.language === lang ? 'bg-card__lang-item--selected' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLanguage(lang);
                      }}
                    >
                      {lang}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .bg-card {
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bg-card--selected {
          border-color: var(--button-color);
          cursor: default;
          box-shadow: 0 0 0 1px var(--button-color);
        }
        .bg-card__header {
          margin-bottom: 6px;
        }
        .bg-card__name {
          font-size: 16px;
          font-weight: 700;
        }
        .bg-card__info-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .bg-card__desc {
          font-size: 13px;
          color: var(--hint-color);
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .bg-card__details {
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          margin-top: 4px;
        }
        .bg-card__feat-info {
          margin-bottom: 12px;
        }
        .bg-card__section {
          margin-bottom: 12px;
        }
        .bg-card__ability-selects {
          display: flex;
          gap: 10px;
        }
        .bg-card__select-group {
          flex: 1;
        }
        .bg-card__select-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--button-color);
          margin-bottom: 4px;
        }
        .bg-card__select {
          padding: 10px 12px;
          font-size: 14px;
        }
        .bg-card__three-info {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .bg-card__lang-picker {
          cursor: pointer;
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bg-card__lang-list {
          margin-top: 6px;
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--section-bg);
        }
        .bg-card__lang-item {
          padding: 10px 14px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--border-color);
        }
        .bg-card__lang-item:last-child {
          border-bottom: none;
        }
        .bg-card__lang-item:active {
          background: var(--secondary-bg);
        }
        .bg-card__lang-item--selected {
          color: var(--button-color);
          font-weight: 600;
          background: color-mix(in srgb, var(--button-color) 8%, var(--section-bg));
        }

        .segmented-control {
          display: flex;
          background: var(--secondary-bg);
          border-radius: var(--radius-sm);
          padding: 2px;
          gap: 2px;
        }
        .segmented-control__btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: var(--text-color);
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .segmented-control__btn--active {
          background: var(--button-color);
          color: var(--button-text-color);
        }
        .segmented-control__btn:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
}
