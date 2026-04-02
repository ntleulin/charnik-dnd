import type { Species } from '../types/game-data';
import { useTelegram } from '../telegram/init';

interface SpeciesCardProps {
  species: Species;
  isSelected: boolean;
  onSelect: (id: string) => void;
  speciesChoices: Record<string, string>;
  onChoicesChanged: (choices: Record<string, string>) => void;
  sizeChoice?: string;
  onSizeChanged: (size: string) => void;
}

export default function SpeciesCard({
  species,
  isSelected,
  onSelect,
  speciesChoices,
  onChoicesChanged,
  sizeChoice,
  onSizeChanged,
}: SpeciesCardProps) {
  const { hapticSelect } = useTelegram();

  const handleSelect = () => {
    hapticSelect();
    onSelect(species.id);
  };

  const handleChoiceChange = (traitId: string, choiceId: string) => {
    hapticSelect();
    onChoicesChanged({ ...speciesChoices, [traitId]: choiceId });
  };

  return (
    <div
      className={`card species-card ${isSelected ? 'species-card--selected' : ''}`}
      onClick={!isSelected ? handleSelect : undefined}
    >
      <div className="card-body">
        <div className="species-card__header">
          <div className="species-card__name">{species.nameRu}</div>
          <div className="species-card__chips">
            <span className="chip">{species.speed} фт.</span>
            {species.darkvision && (
              <span className="chip">Тёмное зрение {species.darkvision} фт.</span>
            )}
            <span className="chip chip--outline">{species.size}</span>
          </div>
        </div>

        {!isSelected && (
          <div className="species-card__desc">{species.descriptionRu}</div>
        )}

        {isSelected && (
          <div className="species-card__details fade-in">
            <div className="species-card__desc">{species.descriptionRu}</div>

            {/* Size options */}
            {species.sizeOptions && species.sizeOptions.length > 1 && (
              <div className="species-card__section">
                <div className="section-title">Размер</div>
                <div className="segmented-control">
                  {species.sizeOptions.map((size) => (
                    <button
                      key={size}
                      className={`segmented-control__btn ${
                        sizeChoice === size ? 'segmented-control__btn--active' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticSelect();
                        onSizeChanged(size);
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Traits */}
            <div className="species-card__traits">
              {species.traits.map((trait) => (
                <div key={trait.id} className="species-card__trait">
                  <div className="species-card__trait-name">{trait.nameRu}</div>
                  <div className="species-card__trait-desc">{trait.descriptionRu}</div>

                  {/* Choice traits */}
                  {trait.choices && trait.choices.length > 0 && (
                    <div className="species-card__choices">
                      {trait.choices.map((choice) => {
                        const isChosen = speciesChoices[trait.id] === choice.id;
                        return (
                          <div
                            key={choice.id}
                            className={`species-card__choice-card ${
                              isChosen ? 'species-card__choice-card--selected' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChoiceChange(trait.id, choice.id);
                            }}
                          >
                            <div className="species-card__choice-radio">
                              <div
                                className={`species-card__radio-dot ${
                                  isChosen ? 'species-card__radio-dot--active' : ''
                                }`}
                              />
                            </div>
                            <div className="species-card__choice-body">
                              <div className="species-card__choice-name">{choice.nameRu}</div>
                              <div className="species-card__choice-desc">
                                {choice.descriptionRu}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .species-card {
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .species-card--selected {
          border-color: var(--button-color);
          cursor: default;
          box-shadow: 0 0 0 1px var(--button-color);
        }
        .species-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 6px;
        }
        .species-card__name {
          font-size: 16px;
          font-weight: 700;
        }
        .species-card__chips {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .species-card__desc {
          font-size: 13px;
          color: var(--hint-color);
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .species-card__details {
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          margin-top: 8px;
        }
        .species-card__section {
          margin-bottom: 12px;
        }
        .species-card__traits {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .species-card__trait {
          padding: 8px 0;
        }
        .species-card__trait-name {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .species-card__trait-desc {
          font-size: 13px;
          color: var(--hint-color);
          line-height: 1.4;
        }
        .species-card__choices {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .species-card__choice-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--border-color);
          background: var(--secondary-bg);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .species-card__choice-card:active {
          transform: scale(0.98);
        }
        .species-card__choice-card--selected {
          border-color: var(--button-color);
          background: color-mix(in srgb, var(--button-color) 8%, var(--section-bg));
        }
        .species-card__choice-radio {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
          transition: border-color 0.2s ease;
        }
        .species-card__choice-card--selected .species-card__choice-radio {
          border-color: var(--button-color);
        }
        .species-card__radio-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: transparent;
          transition: background 0.2s ease;
        }
        .species-card__radio-dot--active {
          background: var(--button-color);
        }
        .species-card__choice-body {
          flex: 1;
          min-width: 0;
        }
        .species-card__choice-name {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .species-card__choice-desc {
          font-size: 12px;
          color: var(--hint-color);
          line-height: 1.3;
        }

        /* Segmented control */
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
