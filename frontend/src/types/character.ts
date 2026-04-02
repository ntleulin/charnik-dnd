export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterClass {
  classId: string;
  level: number;
  subclassId?: string;
}

export interface SpellSlotState {
  total: number;
  used: number;
}

export interface InventoryItem {
  equipmentId: string;
  quantity: number;
  equipped: boolean;
  isCustom?: boolean;
  customName?: string;
  customDescription?: string;
  customDamage?: string;
  customProperties?: string[];
}

export interface Currency {
  cp: number;
  sp: number;
  gp: number;
  ep: number;
  pp: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface Character {
  id: string;
  name: string;
  speciesId: string;
  backgroundId: string;
  abilityScores: AbilityScores;
  classes: CharacterClass[];
  currentHp: number;
  maxHp: number;
  tempHp: number;
  speed: number;
  skillProficiencies: string[];
  savingThrowProficiencies: string[];
  featIds: string[];
  spellSlots: Record<string, SpellSlotState>;
  knownSpells: string[];
  preparedSpells: string[];
  inventory: InventoryItem[];
  currency: Currency;
  featureUsage: Record<string, number>;
  conditions: string[];
  deathSaves: DeathSaves;
  speciesChoices: Record<string, string>;
  backgroundChoices: Record<string, string>;
  sizeChoice?: string;
  languages: string[];
  toolProficiencies: string[];
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ABILITY_NAMES: Record<keyof AbilityScores, { ru: string; en: string; short: string }> = {
  str: { ru: 'Сила', en: 'Strength', short: 'СИЛ' },
  dex: { ru: 'Ловкость', en: 'Dexterity', short: 'ЛОВ' },
  con: { ru: 'Телосложение', en: 'Constitution', short: 'ТЕЛ' },
  int: { ru: 'Интеллект', en: 'Intelligence', short: 'ИНТ' },
  wis: { ru: 'Мудрость', en: 'Wisdom', short: 'МДР' },
  cha: { ru: 'Харизма', en: 'Charisma', short: 'ХАР' },
};

export const SKILLS: Record<string, { ru: string; ability: keyof AbilityScores }> = {
  acrobatics: { ru: 'Акробатика', ability: 'dex' },
  animal_handling: { ru: 'Уход за животными', ability: 'wis' },
  arcana: { ru: 'Магия', ability: 'int' },
  athletics: { ru: 'Атлетика', ability: 'str' },
  deception: { ru: 'Обман', ability: 'cha' },
  history: { ru: 'История', ability: 'int' },
  insight: { ru: 'Проницательность', ability: 'wis' },
  intimidation: { ru: 'Запугивание', ability: 'cha' },
  investigation: { ru: 'Анализ', ability: 'int' },
  medicine: { ru: 'Медицина', ability: 'wis' },
  nature: { ru: 'Природа', ability: 'int' },
  perception: { ru: 'Внимательность', ability: 'wis' },
  performance: { ru: 'Выступление', ability: 'cha' },
  persuasion: { ru: 'Убеждение', ability: 'cha' },
  religion: { ru: 'Религия', ability: 'int' },
  sleight_of_hand: { ru: 'Ловкость рук', ability: 'dex' },
  stealth: { ru: 'Скрытность', ability: 'dex' },
  survival: { ru: 'Выживание', ability: 'wis' },
};

export const CONDITIONS: Record<string, string> = {
  blinded: 'Ослеплённый',
  charmed: 'Очарованный',
  deafened: 'Оглохший',
  exhaustion: 'Истощение',
  frightened: 'Испуганный',
  grappled: 'Схваченный',
  incapacitated: 'Недееспособный',
  invisible: 'Невидимый',
  paralyzed: 'Парализованный',
  petrified: 'Окаменевший',
  poisoned: 'Отравленный',
  prone: 'Лежащий',
  restrained: 'Опутанный',
  stunned: 'Оглушённый',
  unconscious: 'Без сознания',
};
