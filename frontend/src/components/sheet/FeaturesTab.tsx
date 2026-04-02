import { useState, useMemo } from 'react';
import type { Character } from '../../types/character';
import type { ClassInfo, ClassFeature, Feat, Species } from '../../types/game-data';
import { totalLevel } from '../../utils/calculator';
import { useTelegram } from '../../telegram/init';
import { useFeatsMap, useSpeciesMap } from '../../hooks/useGameData';
import BottomSheet from '../BottomSheet';

interface FeaturesTabProps {
  character: Character;
  classesMap: Record<string, ClassInfo>;
  onChange: (patch: Partial<Character>) => void;
}

export default function FeaturesTab({ character, classesMap, onChange }: FeaturesTabProps) {
  const { haptic, hapticSelect } = useTelegram();
  const { data: featsMap } = useFeatsMap();
  const { data: speciesMap } = useSpeciesMap();

  const [selectedFeature, setSelectedFeature] = useState<ClassFeature | null>(null);
  const [selectedFeat, setSelectedFeat] = useState<Feat | null>(null);
  const [showFeatPicker, setShowFeatPicker] = useState(false);
  const [featSearch, setFeatSearch] = useState('');

  const lvl = totalLevel(character);
  const species: Species | undefined = speciesMap?.[character.speciesId];

  // Gather class features per class
  const classFeatures = useMemo(() => {
    const result: { className: string; features: (ClassFeature & { classId: string })[] }[] = [];

    for (const cls of character.classes) {
      const info = classesMap[cls.classId];
      if (!info) continue;

      const features: (ClassFeature & { classId: string })[] = [];

      // Collect features from levels
      for (let lvlNum = 1; lvlNum <= cls.level; lvlNum++) {
        const levelData = info.levels?.[String(lvlNum)];
        if (!levelData?.features) continue;

        for (const featId of levelData.features) {
          const feat = info.features?.[featId];
          if (feat) {
            features.push({ ...feat, level: lvlNum, classId: cls.classId });
          }
        }
      }

      // Subclass features
      if (cls.subclassId) {
        const sub = info.subclasses?.find(s => s.id === cls.subclassId);
        if (sub?.features) {
          for (const [lvlStr, featIds] of Object.entries(sub.features)) {
            const lvlNum = parseInt(lvlStr);
            if (lvlNum > cls.level) continue;
            for (const featId of featIds) {
              const feat = info.features?.[featId];
              if (feat) {
                features.push({ ...feat, level: lvlNum, classId: cls.classId });
              }
            }
          }
        }
      }

      result.push({ className: info.nameRu, features });
    }

    return result;
  }, [character.classes, classesMap]);

  function getMaxUses(feature: ClassFeature): number {
    if (typeof feature.usesPerRest === 'number') return feature.usesPerRest;
    if (feature.usesScaling) {
      // Find the highest level that applies
      const entries = Object.entries(feature.usesScaling)
        .map(([k, v]) => [parseInt(k), v] as [number, number])
        .sort((a, b) => b[0] - a[0]);
      for (const [reqLevel, uses] of entries) {
        if (lvl >= reqLevel) return uses;
      }
    }
    if (typeof feature.usesPerRest === 'string') {
      return parseInt(feature.usesPerRest) || 0;
    }
    return 0;
  }

  function toggleUse(featureId: string, maxUses: number) {
    hapticSelect();
    const current = character.featureUsage[featureId] || 0;
    const next = current >= maxUses ? 0 : current + 1;
    onChange({
      featureUsage: { ...character.featureUsage, [featureId]: next },
    });
  }

  function addFeat(feat: Feat) {
    haptic('light');
    onChange({ featIds: [...character.featIds, feat.id] });
    setShowFeatPicker(false);
    setFeatSearch('');
  }

  function removeFeat(featId: string) {
    haptic('medium');
    onChange({ featIds: character.featIds.filter(f => f !== featId) });
  }

  const restIcon = (restType?: string) => {
    if (restType === 'short') return ' ☕';
    if (restType === 'long') return ' \uD83D\uDECF\uFE0F';
    return '';
  };

  // Available feats for picker
  const availableFeats = useMemo(() => {
    if (!featsMap) return [];
    return Object.values(featsMap).filter(f => {
      if (character.featIds.includes(f.id) && !f.repeatable) return false;
      if (featSearch) {
        const q = featSearch.toLowerCase();
        return f.nameRu.toLowerCase().includes(q) || f.nameEn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [featsMap, character.featIds, featSearch]);

  const FEAT_CATEGORIES: Record<string, string> = {
    origin: 'Стартовая',
    general: 'Общая',
    fighting_style: 'Боевой стиль',
    epic_boon: 'Эпическое благо',
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 8 }}>
      {/* Species Traits */}
      {species && species.traits.length > 0 && (
        <div className="section">
          <div className="section-title">Особенности расы ({species.nameRu})</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {species.traits.map(trait => (
              <div
                key={trait.id}
                className="list-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                onClick={() => setSelectedFeature({
                  id: trait.id,
                  nameRu: trait.nameRu,
                  nameEn: trait.nameEn,
                  descriptionRu: trait.descriptionRu,
                  descriptionEn: trait.descriptionEn,
                })}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{trait.nameRu}</span>
                <span style={{ fontSize: 12, color: 'var(--hint-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {trait.descriptionRu.slice(0, 80)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Features */}
      {classFeatures.map(({ className, features }) => (
        <div key={className} className="section">
          <div className="section-title">Умения класса ({className})</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {features.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint-color)', fontSize: 13 }}>
                Нет доступных умений
              </div>
            )}
            {features.map(feat => {
              const maxUses = getMaxUses(feat);
              const usedCount = character.featureUsage[feat.id] || 0;
              const availCount = Math.max(0, maxUses - usedCount);

              return (
                <div
                  key={feat.id}
                  className="list-item"
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '10px 16px' }}
                  onClick={() => setSelectedFeature(feat)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                      {feat.nameRu}
                      {feat.restType && (
                        <span style={{ fontSize: 12 }}>{restIcon(feat.restType)}</span>
                      )}
                    </span>
                    <span className="chip" style={{ fontSize: 10, padding: '2px 6px' }}>
                      Ур. {feat.level}
                    </span>
                  </div>

                  {/* Usage circles */}
                  {maxUses > 0 && maxUses <= 10 && (
                    <div
                      className="usage-circles"
                      onClick={e => e.stopPropagation()}
                    >
                      {Array.from({ length: maxUses }).map((_, i) => (
                        <div
                          key={i}
                          className={`usage-circle${i < availCount ? ' usage-circle--filled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUse(feat.id, maxUses);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Large pools with +/- */}
                  {maxUses > 10 && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        className="btn btn--sm btn--secondary"
                        style={{ padding: '4px 10px', minWidth: 32 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticSelect();
                          const current = character.featureUsage[feat.id] || 0;
                          if (current < maxUses) {
                            onChange({
                              featureUsage: { ...character.featureUsage, [feat.id]: current + 1 },
                            });
                          }
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 15, minWidth: 40, textAlign: 'center' }}>
                        {availCount}/{maxUses}
                      </span>
                      <button
                        className="btn btn--sm btn--secondary"
                        style={{ padding: '4px 10px', minWidth: 32 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticSelect();
                          const current = character.featureUsage[feat.id] || 0;
                          if (current > 0) {
                            onChange({
                              featureUsage: { ...character.featureUsage, [feat.id]: current - 1 },
                            });
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Feats */}
      <div className="section">
        <div className="section-title">Черты</div>
        {character.featIds.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint-color)', fontSize: 13 }}>
            Нет выбранных черт
          </div>
        )}
        {character.featIds.map(featId => {
          const feat = featsMap?.[featId];
          if (!feat) return null;
          return (
            <div
              key={featId}
              className="card"
              style={{ marginBottom: 8, padding: '12px 16px' }}
              onClick={() => setSelectedFeat(feat)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{feat.nameRu}</div>
                  <div style={{ fontSize: 11, color: 'var(--hint-color)' }}>
                    {FEAT_CATEGORIES[feat.category] || feat.category}
                  </div>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--destructive)', padding: 4 }}
                  onClick={e => {
                    e.stopPropagation();
                    removeFeat(featId);
                  }}
                >
                  x
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--hint-color)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {feat.descriptionRu.slice(0, 80)}...
              </div>
            </div>
          );
        })}
        <button
          className="btn btn--secondary btn--full btn--sm"
          style={{ marginTop: 8 }}
          onClick={() => setShowFeatPicker(true)}
        >
          + Добавить черту
        </button>
      </div>

      {/* Feature Detail Bottom Sheet */}
      <BottomSheet
        isOpen={selectedFeature !== null}
        onClose={() => setSelectedFeature(null)}
        title={selectedFeature?.nameRu}
      >
        {selectedFeature && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--hint-color)', marginBottom: 8 }}>
              {selectedFeature.nameEn}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selectedFeature.descriptionRu}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Feat Detail Bottom Sheet */}
      <BottomSheet
        isOpen={selectedFeat !== null}
        onClose={() => setSelectedFeat(null)}
        title={selectedFeat?.nameRu}
      >
        {selectedFeat && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--hint-color)', marginBottom: 4 }}>
              {selectedFeat.nameEn}
            </div>
            <div className="chip" style={{ marginBottom: 8 }}>
              {FEAT_CATEGORIES[selectedFeat.category] || selectedFeat.category}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
              {selectedFeat.descriptionRu}
            </div>
            {selectedFeat.benefits.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Преимущества:</div>
                {selectedFeat.benefits.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--button-color)' }}>
                    {b.descriptionRu}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Feat Picker Bottom Sheet */}
      <BottomSheet
        isOpen={showFeatPicker}
        onClose={() => { setShowFeatPicker(false); setFeatSearch(''); }}
        title="Выбрать черту"
      >
        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Поиск..."
            value={featSearch}
            onChange={e => setFeatSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {availableFeats.map(feat => (
            <div
              key={feat.id}
              className="list-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
              onClick={() => addFeat(feat)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{feat.nameRu}</span>
                <span className="chip" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {FEAT_CATEGORIES[feat.category] || feat.category}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--hint-color)' }}>
                {feat.descriptionRu.slice(0, 60)}...
              </span>
            </div>
          ))}
          {availableFeats.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint-color)' }}>
              Ничего не найдено
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
