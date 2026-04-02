export interface SpeciesTraitChoice {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
}

export interface SpeciesTrait {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  type?: string; // passive, active, choice
  choices?: SpeciesTraitChoice[];
}

export interface Species {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  speed: number;
  size: string;
  sizeOptions?: string[];
  darkvision?: number;
  traits: SpeciesTrait[];
}

export interface Background {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  skillProficiencies: string[];
  toolProficiency: string;
  abilityScoreOptions: string[];
  originFeat: string;
  startingGold: number;
  startingEquipment: string[];
}

export interface FeatureChoice {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
}

export interface ClassFeature {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  level?: number;
  actionType?: string;
  usesPerRest?: number | string;
  restType?: string;
  usesScaling?: Record<string, number>;
  choices?: FeatureChoice[];
}

export interface SkillChoice {
  count: number;
  from: string[];
}

export interface LevelFeatures {
  features: string[];
  proficiencyBonus?: number;
  cantripsKnown?: number;
  spellsKnown?: number;
}

export interface SpellSlotProgression {
  slots: number[];
  cantripsKnown?: number;
  spellsKnown?: number;
  spellsPrepared?: number;
}

export interface MulticlassRequirement {
  minimumScores: Record<string, number>;
  requireAll?: boolean;
}

export interface Subclass {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  features: Record<string, string[]>;
  additionalSpells?: string[];
}

export interface ClassInfo {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  hitDie: string;
  hitDieValue: number;
  primaryAbilities: string[];
  savingThrows: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies?: string[];
  skillChoice: SkillChoice;
  multiclassRequirement?: MulticlassRequirement;
  multiclassProficiencies?: string[];
  spellcastingAbility?: string;
  spellcastingType?: string;
  subclassLevel: number;
  levels: Record<string, LevelFeatures>;
  subclasses: Subclass[];
  spellSlots?: Record<string, SpellSlotProgression>;
  features?: Record<string, ClassFeature>;
}

export interface Spell {
  id: string;
  nameRu: string;
  nameEn: string;
  level: number;
  school: string;
  castingTime: string;
  castingTimeEn?: string;
  range: string;
  rangeEn?: string;
  components: string;
  componentsEn?: string;
  material?: string;
  materialEn?: string;
  duration: string;
  durationEn?: string;
  concentration: boolean;
  ritual: boolean;
  descriptionRu: string;
  descriptionEn: string;
  higherLevelRu?: string;
  higherLevelEn?: string;
  damageType?: string;
  savingThrow?: string;
  classes: string[];
  levelText?: string;
  levelTextEn?: string;
}

export interface Equipment {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu?: string;
  descriptionEn?: string;
  category: string;
  cost?: number;
  costUnit?: string;
  weight?: number;
  isWeapon?: boolean;
  isArmor?: boolean;
  isShield?: boolean;
  damage?: string;
  damageType?: string;
  properties?: string[];
  weaponType?: string;
  armorBase?: number;
  maxDexBonus?: number;
  stealthDisadvantage?: boolean;
  strengthRequired?: number;
}

export interface FeatBenefit {
  descriptionRu: string;
  descriptionEn: string;
  type?: string;
}

export interface Feat {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  category: string;
  prerequisiteLevel?: string;
  prerequisiteAbility?: string;
  prerequisiteOther?: string;
  abilityScoreIncrease?: string[];
  abilityScoreAmount?: number;
  repeatable?: boolean;
  benefits: FeatBenefit[];
}
