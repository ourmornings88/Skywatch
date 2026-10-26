import React from 'react';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onBack: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ onDigit, onBack }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="keypad">
      {keys.map((k, idx) => {
        if (!k) {
          return <button key={idx} style={{ visibility: 'hidden' }} />;
        }
        return (
          <button
            key={idx}
            onClick={(e) => {
              e.preventDefault();
              if (k === '⌫') {
                onBack();
              } else {
                onDigit(k);
              }
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
};
