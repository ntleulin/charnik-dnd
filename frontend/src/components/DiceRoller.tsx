import { useEffect, useState } from 'react';
import { rollDice, formatDiceResult, type DiceResult } from '../utils/dice';
import { useTelegram } from '../telegram/init';

interface DiceRollerProps {
  notation: string;
  label: string;
  onClose: () => void;
  onResult?: (result: DiceResult) => void;
}

export default function DiceRoller({ notation, label, onClose, onResult }: DiceRollerProps) {
  const { haptic } = useTelegram();
  const [result, setResult] = useState<DiceResult | null>(null);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    haptic('heavy');
    const r = rollDice(notation);
    // Brief animation delay
    const t1 = setTimeout(() => {
      setResult(r);
      setAnimating(false);
      onResult?.(r);
    }, 300);
    const t2 = setTimeout(onClose, 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div className="dice-result" style={{ flexDirection: 'column', minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--hint-color)', marginBottom: 4 }}>
          {label}
        </div>
        {animating ? (
          <div className="total" style={{ animation: 'diceAppear 0.3s ease' }}>
            ...
          </div>
        ) : result ? (
          <>
            <div className="total">{result.total}</div>
            <div className="breakdown">{formatDiceResult(result)}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
