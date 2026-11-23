import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
}

const FRACTION_RE = /(\d+ )?(−?)([\dπ√]+)\/([\dπ√]+)/g;

export const MathText: React.FC<MathTextProps> = ({text, className}) => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FRACTION_RE.lastIndex = 0;
  while ((match = FRACTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const whole = match[1] ? match[1].trim() + ' ' : '';
    const sign = match[2] || '';
    const numerator = match[3];
    const denominator = match[4];

    nodes.push(
      <React.Fragment key={`${match.index}-${numerator}-${denominator}`}>
        {whole}
        {sign}
        <span className="inline-flex flex-col items-center justify-center align-middle text-center leading-[1.15] mx-[0.15em] text-[0.9em]">
          <span className="border-b-[1.5px] border-current px-1">{numerator}</span>
          <span className="px-1">{denominator}</span>
        </span>
      </React.Fragment>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
};
