export interface DiceResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  dropped?: number[];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Parse and roll dice notation like "2d6+3", "1d20", "4d6kh3" */
export function rollDice(notation: string): DiceResult {
  const match = notation.match(/^(\d+)d(\d+)(?:kh(\d+))?([+-]\d+)?$/i);
  if (!match) {
    return { notation, rolls: [0], modifier: 0, total: 0 };
  }

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const keepHighest = match[3] ? parseInt(match[3]) : undefined;
  const modifier = match[4] ? parseInt(match[4]) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(randomInt(1, sides));
  }

  let keptRolls = rolls;
  let dropped: number[] | undefined;

  if (keepHighest && keepHighest < count) {
    const sorted = [...rolls].sort((a, b) => b - a);
    keptRolls = sorted.slice(0, keepHighest);
    dropped = sorted.slice(keepHighest);
  }

  const sum = keptRolls.reduce((a, b) => a + b, 0);

  return {
    notation,
    rolls,
    modifier,
    total: sum + modifier,
    dropped,
  };
}

/** Roll a single die */
export function rollD(sides: number): number {
  return randomInt(1, sides);
}

/** Roll 4d6, drop lowest — standard ability score generation */
export function rollAbilityScore(): DiceResult {
  return rollDice('4d6kh3');
}

/** Roll initiative (1d20 + dex modifier) */
export function rollInitiative(dexMod: number): DiceResult {
  const result = rollDice(`1d20${dexMod >= 0 ? '+' + dexMod : String(dexMod)}`);
  return result;
}

/** Roll hit dice for healing */
export function rollHitDice(hitDie: string, conMod: number): DiceResult {
  const mod = conMod >= 0 ? `+${conMod}` : String(conMod);
  return rollDice(`1${hitDie}${mod}`);
}

/** Format a dice result for display */
export function formatDiceResult(result: DiceResult): string {
  const rollsStr = result.rolls.join(', ');
  const droppedStr = result.dropped ? ` (отброшены: ${result.dropped.join(', ')})` : '';
  const modStr = result.modifier > 0 ? ` + ${result.modifier}` : result.modifier < 0 ? ` - ${Math.abs(result.modifier)}` : '';
  return `[${rollsStr}]${droppedStr}${modStr} = ${result.total}`;
}
