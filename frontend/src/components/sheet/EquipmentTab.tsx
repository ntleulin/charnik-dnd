import { useState, useMemo } from 'react';
import type { Character, InventoryItem, Currency } from '../../types/character';
import type { ClassInfo, Equipment } from '../../types/game-data';
import {
  abilityModifier,
  proficiencyBonus,
  totalLevel,
  formatModifier,
} from '../../utils/calculator';
import { useTelegram } from '../../telegram/init';
import { useEquipment, useEquipmentMap } from '../../hooks/useGameData';
import DiceRoller from '../DiceRoller';
import BottomSheet from '../BottomSheet';

interface EquipmentTabProps {
  character: Character;
  classesMap: Record<string, ClassInfo>;
  onChange: (patch: Partial<Character>) => void;
}

const CURRENCY_NAMES: Record<keyof Currency, string> = {
  cp: 'ММ',
  sp: 'СМ',
  ep: 'ЭМ',
  gp: 'ЗМ',
  pp: 'ПМ',
};

const CURRENCY_COLORS: Record<keyof Currency, string> = {
  cp: '#b87333',
  sp: '#c0c0c0',
  ep: '#7b68ee',
  gp: '#ffd700',
  pp: '#e5e4e2',
};

export default function EquipmentTab({ character, classesMap: _classesMap, onChange }: EquipmentTabProps) {
  void _classesMap;
  const { haptic, hapticSelect } = useTelegram();
  const { data: allEquipment } = useEquipment();
  const { data: equipmentMap } = useEquipmentMap();

  const [diceRoll, setDiceRoll] = useState<{ notation: string; label: string } | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserCategory, setBrowserCategory] = useState<string | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<keyof Currency | null>(null);
  const [currencyInput, setCurrencyInput] = useState('');

  // Custom item form
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customIsWeapon, setCustomIsWeapon] = useState(false);
  const [customDamage, setCustomDamage] = useState('');
  const [customProperties, setCustomProperties] = useState('');

  const lvl = totalLevel(character);
  const profBonus = proficiencyBonus(lvl);
  const strMod = abilityModifier(character.abilityScores.str);
  const dexMod = abilityModifier(character.abilityScores.dex);

  // Categorize inventory
  const weapons = useMemo(() => {
    return character.inventory.filter(item => {
      if (item.isCustom) return !!item.customDamage;
      const eq = equipmentMap?.[item.equipmentId];
      return eq?.isWeapon;
    });
  }, [character.inventory, equipmentMap]);

  const armor = useMemo(() => {
    return character.inventory.filter(item => {
      if (item.isCustom) return false;
      const eq = equipmentMap?.[item.equipmentId];
      return eq?.isArmor || eq?.isShield;
    });
  }, [character.inventory, equipmentMap]);

  const otherItems = useMemo(() => {
    return character.inventory.filter(item => {
      if (item.isCustom) return !item.customDamage;
      const eq = equipmentMap?.[item.equipmentId];
      return !eq?.isWeapon && !eq?.isArmor && !eq?.isShield;
    });
  }, [character.inventory, equipmentMap]);

  function getItemName(item: InventoryItem): string {
    if (item.isCustom) return item.customName || 'Предмет';
    return equipmentMap?.[item.equipmentId]?.nameRu || item.equipmentId;
  }

  function getWeaponAttackBonus(item: InventoryItem): number {
    const eq = equipmentMap?.[item.equipmentId];
    const isFinesse = eq?.properties?.includes('finesse') || item.customProperties?.includes('finesse');
    const isRanged = eq?.weaponType === 'ranged';
    const abilityMod = (isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod);
    return abilityMod + profBonus;
  }

  function getWeaponDamageMod(item: InventoryItem): number {
    const eq = equipmentMap?.[item.equipmentId];
    const isFinesse = eq?.properties?.includes('finesse') || item.customProperties?.includes('finesse');
    const isRanged = eq?.weaponType === 'ranged';
    return isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod;
  }

  function rollAttack(item: InventoryItem) {
    const bonus = getWeaponAttackBonus(item);
    const name = getItemName(item);
    setDiceRoll({
      notation: `1d20${bonus >= 0 ? '+' + bonus : String(bonus)}`,
      label: `Атака: ${name}`,
    });
  }

  function rollDamage(item: InventoryItem) {
    const eq = equipmentMap?.[item.equipmentId];
    const damage = item.isCustom ? (item.customDamage || '1d4') : (eq?.damage || '1d4');
    const mod = getWeaponDamageMod(item);
    const name = getItemName(item);
    setDiceRoll({
      notation: `${damage}${mod >= 0 ? '+' + mod : String(mod)}`,
      label: `Урон: ${name}`,
    });
  }

  function toggleEquipped(index: number) {
    hapticSelect();
    const newInventory = [...character.inventory];
    newInventory[index] = { ...newInventory[index], equipped: !newInventory[index].equipped };
    onChange({ inventory: newInventory });
  }

  function removeItem(index: number) {
    haptic('medium');
    const newInventory = character.inventory.filter((_, i) => i !== index);
    onChange({ inventory: newInventory });
  }

  function updateQuantity(index: number, delta: number) {
    hapticSelect();
    const newInventory = [...character.inventory];
    const newQty = Math.max(0, newInventory[index].quantity + delta);
    if (newQty === 0) {
      onChange({ inventory: newInventory.filter((_, i) => i !== index) });
    } else {
      newInventory[index] = { ...newInventory[index], quantity: newQty };
      onChange({ inventory: newInventory });
    }
  }

  function addItem(eq: Equipment) {
    haptic('light');
    const existing = character.inventory.findIndex(i => i.equipmentId === eq.id && !i.isCustom);
    if (existing >= 0) {
      updateQuantity(existing, 1);
    } else {
      onChange({
        inventory: [...character.inventory, {
          equipmentId: eq.id,
          quantity: 1,
          equipped: false,
        }],
      });
    }
    setShowBrowser(false);
    setBrowserSearch('');
  }

  function addCustomItem() {
    if (!customName.trim()) return;
    const item: InventoryItem = {
      equipmentId: `custom_${Date.now()}`,
      quantity: 1,
      equipped: false,
      isCustom: true,
      customName: customName,
      customDescription: customDesc,
      customDamage: customIsWeapon ? customDamage : undefined,
      customProperties: customIsWeapon && customProperties
        ? customProperties.split(',').map(s => s.trim())
        : undefined,
    };
    onChange({ inventory: [...character.inventory, item] });
    setShowCustomForm(false);
    resetCustomForm();
  }

  function resetCustomForm() {
    setCustomName('');
    setCustomDesc('');
    setCustomIsWeapon(false);
    setCustomDamage('');
    setCustomProperties('');
  }

  function saveCurrency() {
    if (editingCurrency) {
      const val = parseInt(currencyInput);
      if (!isNaN(val)) {
        onChange({
          currency: { ...character.currency, [editingCurrency]: Math.max(0, val) },
        });
      }
    }
    setEditingCurrency(null);
  }

  // Browser filter
  const browserItems = useMemo(() => {
    if (!allEquipment) return [];
    return allEquipment.filter(eq => {
      if (browserCategory && eq.category !== browserCategory) return false;
      if (browserSearch) {
        const q = browserSearch.toLowerCase();
        return eq.nameRu.toLowerCase().includes(q) || eq.nameEn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allEquipment, browserCategory, browserSearch]);

  const categories = useMemo(() => {
    if (!allEquipment) return [];
    return [...new Set(allEquipment.map(e => e.category))];
  }, [allEquipment]);

  const CATEGORY_NAMES: Record<string, string> = {
    weapon: 'Оружие',
    armor: 'Доспехи',
    shield: 'Щит',
    adventuring_gear: 'Снаряжение',
    tool: 'Инструменты',
    ammunition: 'Боеприпасы',
    potion: 'Зелья',
    wondrous: 'Чудесные',
    misc: 'Прочее',
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 8 }}>
      {/* Weapons */}
      <div className="section">
        <div className="section-title">Оружие</div>
        {weapons.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--hint-color)', fontSize: 13 }}>
            Нет оружия
          </div>
        )}
        {weapons.map((item) => {
          const globalIdx = character.inventory.indexOf(item);
          const eq = equipmentMap?.[item.equipmentId];
          const name = getItemName(item);
          const attackBonus = getWeaponAttackBonus(item);
          const damageMod = getWeaponDamageMod(item);
          const damage = item.isCustom ? (item.customDamage || '1d4') : (eq?.damage || '1d4');
          const damageType = eq?.damageType || '';
          const props = item.isCustom ? (item.customProperties || []) : (eq?.properties || []);

          return (
            <div key={globalIdx} className="card" style={{ marginBottom: 8, padding: '10px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid var(--button-color)`,
                      background: item.equipped ? 'var(--button-color)' : 'transparent',
                      display: 'inline-block',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleEquipped(globalIdx)}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--destructive)', padding: 4, fontSize: 12 }}
                  onClick={() => removeItem(globalIdx)}
                >
                  x
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn--sm btn--secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => rollAttack(item)}
                >
                  Атака {formatModifier(attackBonus)}
                </button>
                <button
                  className="btn btn--sm btn--secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => rollDamage(item)}
                >
                  {damage}{damageMod >= 0 ? '+' : ''}{damageMod} {damageType}
                </button>
              </div>
              {props.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {props.map(p => (
                    <span key={p} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Armor */}
      {armor.length > 0 && (
        <div className="section">
          <div className="section-title">Доспехи</div>
          {armor.map(item => {
            const globalIdx = character.inventory.indexOf(item);
            const eq = equipmentMap?.[item.equipmentId];
            const name = getItemName(item);
            return (
              <div key={globalIdx} className="card" style={{ marginBottom: 8, padding: '10px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid var(--button-color)`,
                        background: item.equipped ? 'var(--button-color)' : 'transparent',
                        display: 'inline-block',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleEquipped(globalIdx)}
                    />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {eq?.armorBase && (
                      <span className="chip" style={{ fontSize: 11 }}>
                        КЗ {eq.armorBase}{eq.maxDexBonus != null ? ` + ЛОВ(макс ${eq.maxDexBonus})` : ' + ЛОВ'}
                      </span>
                    )}
                    {eq?.isShield && (
                      <span className="chip" style={{ fontSize: 11 }}>+2 КЗ</span>
                    )}
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--destructive)', padding: 4, fontSize: 12 }}
                      onClick={() => removeItem(globalIdx)}
                    >
                      x
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Currency */}
      <div className="section">
        <div className="section-title">Валюта</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['cp', 'sp', 'ep', 'gp', 'pp'] as (keyof Currency)[]).map(coin => (
            <div
              key={coin}
              className="stat-card"
              style={{ flex: 1, padding: '8px 4px' }}
              onClick={() => {
                setCurrencyInput(String(character.currency[coin]));
                setEditingCurrency(coin);
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: CURRENCY_COLORS[coin] }}>
                {CURRENCY_NAMES[coin]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{character.currency[coin]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory */}
      <div className="section">
        <div className="section-title">Инвентарь</div>
        {otherItems.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--hint-color)', fontSize: 13 }}>
            Пусто
          </div>
        )}
        <div className="card" style={{ overflow: 'hidden' }}>
          {otherItems.map(item => {
            const globalIdx = character.inventory.indexOf(item);
            const name = getItemName(item);
            return (
              <div
                key={globalIdx}
                className="list-item"
                style={{ justifyContent: 'space-between', padding: '8px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 14 }}>{name}</span>
                  {item.quantity > 1 && (
                    <span className="badge">{item.quantity}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '2px 6px', fontSize: 14 }}
                    onClick={() => updateQuantity(globalIdx, -1)}
                  >
                    -
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '2px 6px', fontSize: 14 }}
                    onClick={() => updateQuantity(globalIdx, 1)}
                  >
                    +
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ color: 'var(--destructive)', padding: '2px 6px', fontSize: 12 }}
                    onClick={() => removeItem(globalIdx)}
                  >
                    x
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn--secondary btn--sm" style={{ flex: 1 }} onClick={() => setShowBrowser(true)}>
          Добавить предмет
        </button>
        <button className="btn btn--secondary btn--sm" style={{ flex: 1 }} onClick={() => setShowCustomForm(true)}>
          Свой предмет
        </button>
      </div>

      {/* Currency Edit */}
      <BottomSheet
        isOpen={editingCurrency !== null}
        onClose={() => setEditingCurrency(null)}
        title={editingCurrency ? CURRENCY_NAMES[editingCurrency] : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="number"
            value={currencyInput}
            onChange={e => setCurrencyInput(e.target.value)}
            autoFocus
            style={{ textAlign: 'center', fontSize: 24, fontWeight: 700 }}
          />
          <button className="btn btn--primary btn--full" onClick={saveCurrency}>
            Сохранить
          </button>
        </div>
      </BottomSheet>

      {/* Equipment Browser */}
      <BottomSheet
        isOpen={showBrowser}
        onClose={() => { setShowBrowser(false); setBrowserSearch(''); setBrowserCategory(null); }}
        title="Добавить предмет"
      >
        <div style={{ marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Поиск..."
            value={browserSearch}
            onChange={e => setBrowserSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          <span
            className={`chip ${browserCategory === null ? 'chip--accent' : 'chip--outline'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setBrowserCategory(null)}
          >
            Все
          </span>
          {categories.map(cat => (
            <span
              key={cat}
              className={`chip ${browserCategory === cat ? 'chip--accent' : 'chip--outline'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setBrowserCategory(cat)}
            >
              {CATEGORY_NAMES[cat] || cat}
            </span>
          ))}
        </div>
        <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {browserItems.slice(0, 50).map(eq => (
            <div
              key={eq.id}
              className="list-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
              onClick={() => addItem(eq)}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>{eq.nameRu}</span>
              <div style={{ display: 'flex', gap: 4, fontSize: 11, color: 'var(--hint-color)' }}>
                <span>{CATEGORY_NAMES[eq.category] || eq.category}</span>
                {eq.damage && <span>| {eq.damage}</span>}
                {eq.armorBase && <span>| КЗ {eq.armorBase}</span>}
                {eq.cost && <span>| {eq.cost} {eq.costUnit || 'зм'}</span>}
              </div>
            </div>
          ))}
          {browserItems.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint-color)' }}>
              Ничего не найдено
            </div>
          )}
          {browserItems.length > 50 && (
            <div style={{ padding: 8, textAlign: 'center', color: 'var(--hint-color)', fontSize: 12 }}>
              Показаны первые 50. Уточните поиск.
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Custom Item Form */}
      <BottomSheet
        isOpen={showCustomForm}
        onClose={() => { setShowCustomForm(false); resetCustomForm(); }}
        title="Свой предмет"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" placeholder="Название" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
          <textarea className="input" placeholder="Описание" value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={customIsWeapon} onChange={e => setCustomIsWeapon(e.target.checked)} />
            Это оружие
          </label>
          {customIsWeapon && (
            <>
              <input className="input" placeholder="Урон (напр. 1d8)" value={customDamage} onChange={e => setCustomDamage(e.target.value)} />
              <input className="input" placeholder="Свойства (через запятую)" value={customProperties} onChange={e => setCustomProperties(e.target.value)} />
            </>
          )}
          <button className="btn btn--primary btn--full" onClick={addCustomItem} disabled={!customName.trim()}>
            Добавить
          </button>
        </div>
      </BottomSheet>

      {/* Dice Roll */}
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
