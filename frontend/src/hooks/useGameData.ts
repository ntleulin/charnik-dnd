import { useState, useEffect } from 'react';
import type { ClassInfo, Species, Background, Spell, Equipment, Feat } from '../types/game-data';

// Import JSON data directly (bundled with app)
import speciesData from '../data/species.json';
import backgroundsData from '../data/backgrounds.json';
import spellsData from '../data/spells.json';
import equipmentData from '../data/equipment.json';
import featsData from '../data/feats.json';

// Import class files
import barbarianData from '../data/classes/barbarian.json';
import bardData from '../data/classes/bard.json';
import clericData from '../data/classes/cleric.json';
import druidData from '../data/classes/druid.json';
import fighterData from '../data/classes/fighter.json';
import monkData from '../data/classes/monk.json';
import paladinData from '../data/classes/paladin.json';
import rangerData from '../data/classes/ranger.json';
import rogueData from '../data/classes/rogue.json';
import sorcererData from '../data/classes/sorcerer.json';
import warlockData from '../data/classes/warlock.json';
import wizardData from '../data/classes/wizard.json';

const classFiles = [
  barbarianData, bardData, clericData, druidData,
  fighterData, monkData, paladinData, rangerData,
  rogueData, sorcererData, warlockData, wizardData,
];

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useStaticData<T>(rawData: unknown): DataState<T> {
  const [state] = useState<DataState<T>>({
    data: rawData as T,
    loading: false,
    error: null,
  });
  return state;
}

export function useClasses(): DataState<Record<string, ClassInfo>> {
  const [state, setState] = useState<DataState<Record<string, ClassInfo>>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const map: Record<string, ClassInfo> = {};
    for (const cls of classFiles) {
      const c = cls as unknown as ClassInfo;
      map[c.id] = c;
    }
    setState({ data: map, loading: false, error: null });
  }, []);

  return state;
}

export function useSpecies(): DataState<Species[]> {
  return useStaticData<Species[]>(speciesData);
}

export function useBackgrounds(): DataState<Background[]> {
  return useStaticData<Background[]>(backgroundsData);
}

export function useSpells(): DataState<Spell[]> {
  return useStaticData<Spell[]>(spellsData);
}

export function useEquipment(): DataState<Equipment[]> {
  return useStaticData<Equipment[]>(equipmentData);
}

export function useFeats(): DataState<Feat[]> {
  return useStaticData<Feat[]>(featsData);
}

// Helpers
export function useSpeciesMap(): DataState<Record<string, Species>> {
  const { data: species, ...rest } = useSpecies();
  const map = species ? Object.fromEntries(species.map(s => [s.id, s])) : null;
  return { data: map, ...rest };
}

export function useBackgroundsMap(): DataState<Record<string, Background>> {
  const { data: backgrounds, ...rest } = useBackgrounds();
  const map = backgrounds ? Object.fromEntries(backgrounds.map(b => [b.id, b])) : null;
  return { data: map, ...rest };
}

export function useSpellsMap(): DataState<Record<string, Spell>> {
  const { data: spells, ...rest } = useSpells();
  const map = spells ? Object.fromEntries(spells.map(s => [s.id, s])) : null;
  return { data: map, ...rest };
}

export function useEquipmentMap(): DataState<Record<string, Equipment>> {
  const { data: equipment, ...rest } = useEquipment();
  const map = equipment ? Object.fromEntries(equipment.map(e => [e.id, e])) : null;
  return { data: map, ...rest };
}

export function useFeatsMap(): DataState<Record<string, Feat>> {
  const { data: feats, ...rest } = useFeats();
  const map = feats ? Object.fromEntries(feats.map(f => [f.id, f])) : null;
  return { data: map, ...rest };
}
