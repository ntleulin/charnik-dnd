interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      <div className="step-indicator__bar">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`step-indicator__segment ${
              i < currentStep
                ? 'step-indicator__segment--done'
                : i === currentStep
                ? 'step-indicator__segment--active'
                : ''
            }`}
          />
        ))}
      </div>
      <div className="step-indicator__label">{labels[currentStep]}</div>
      <style>{`
        .step-indicator {
          margin-bottom: 16px;
        }
        .step-indicator__bar {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }
        .step-indicator__segment {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: var(--border-color);
          transition: background 0.3s ease;
        }
        .step-indicator__segment--done {
          background: var(--button-color);
        }
        .step-indicator__segment--active {
          background: var(--button-color);
          opacity: 0.6;
          animation: stepPulse 1.5s ease infinite;
        }
        @keyframes stepPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .step-indicator__label {
          font-size: 13px;
          font-weight: 600;
          color: var(--hint-color);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
