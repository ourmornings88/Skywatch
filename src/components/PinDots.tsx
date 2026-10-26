import React from 'react';
import { PIN_LEN } from '../utils/crypto';

interface PinDotsProps {
  length: number;
}

export const PinDots: React.FC<PinDotsProps> = ({ length }) => {
  return (
    <div className="pin-dots">
      {Array.from({ length: PIN_LEN }).map((_, i) => (
        <div
          key={i}
          className={`pin-dot ${i < length ? 'filled' : ''}`}
        />
      ))}
    </div>
  );
};
