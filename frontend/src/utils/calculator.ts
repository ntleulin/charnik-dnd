import type { AbilityScores, Character } from '../types/character';
import type { ClassInfo } from '../types/game-data';

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(totalLevel: number): number {
  if (totalLevel <= 0) return 2;
  return Math.ceil(totalLevel / 4) + 1;
}

export function totalLevel(character: Character): number {
  return character.classes.reduce((sum, c) => sum + c.level, 0);
}

export function calculateMaxHp(
  character: Character,
  classesMap: Record<string, ClassInfo>,
): number {
  const conMod = abilityModifier(character.abilityScores.con);
  let hp = 0;
  let isFirst = true;

  for (const cls of character.classes) {
    const info = classesMap[cls.classId];
    if (!info) continue;
    const hitDie = info.hitDieValue;

    for (let lvl = 1; lvl <= cls.level; lvl++) {
      if (isFirst && lvl === 1) {
        hp += hitDie + conMod; // Max hit die at level 1
        isFirst = false;
      } else {
        hp += Math.floor(hitDie / 2) + 1 + conMod; // Average
      }
    }
  }

  return Math.max(hp, 1);
}

export function calculateAC(
  character: Character,
  equipmentMap: Record<string, { armorBase?: number; maxDexBonus?: number; isShield?: boolean }>,
): number {
  const dexMod = abilityModifier(character.abilityScores.dex);
  let baseAC = 10 + dexMod;
  let shieldBonus = 0;

  for (const item of character.inventory) {
    if (!item.equipped) continue;
    const eq = equipmentMap[item.equipmentId];
    if (!eq) continue;

    if (eq.isShield) {
      shieldBonus = 2;
    } else if (eq.armorBase != null) {
      const maxDex = eq.maxDexBonus ?? 99;
      baseAC = eq.armorBase + Math.min(dexMod, maxDex);
    }
  }

  return baseAC + shieldBonus;
}

export function spellcastingAbilityMod(
  character: Character,
  classesMap: Record<string, ClassInfo>,
): number {
  for (const cls of character.classes) {
    const info = classesMap[cls.classId];
    if (info?.spellcastingAbility) {
      return abilityModifier(
        character.abilityScores[info.spellcastingAbility as keyof AbilityScores] ?? 10,
      );
    }
  }
  return 0;
}

export function spellSaveDC(
  character: Character,
  classesMap: Record<string, ClassInfo>,
): number {
  return 8 + proficiencyBonus(totalLevel(character)) + spellcastingAbilityMod(character, classesMap);
}

export function spellAttackBonus(
  character: Character,
  classesMap: Record<string, ClassInfo>,
): number {
  return proficiencyBonus(totalLevel(character)) + spellcastingAbilityMod(character, classesMap);
}

// Multiclass spell slot table (PHB 2024)
const MULTICLASS_SLOTS: Record<number, number[]> = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

export function calculateMulticlassSpellSlots(
  character: Character,
  classesMap: Record<string, ClassInfo>,
): Record<number, number> {
  let casterLevel = 0;

  for (const cls of character.classes) {
    const info = classesMap[cls.classId];
    if (!info?.spellcastingAbility) continue;

    switch (info.spellcastingType) {
      case 'full':
        casterLevel += cls.level;
        break;
      case 'half':
        casterLevel += Math.floor(cls.level / 2);
        break;
      case 'third':
        casterLevel += Math.floor(cls.level / 3);
        break;
    }
  }

  if (casterLevel <= 0) return {};

  const slots = MULTICLASS_SLOTS[Math.min(casterLevel, 20)] ?? [];
  const result: Record<number, number> = {};
  slots.forEach((count, i) => {
    if (count > 0) result[i + 1] = count;
  });
  return result;
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
