import React from 'react';
import logoUrl from '../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
  /** Draw the rounded app tile behind the mark (splash, about screen). */
  withTile?: boolean;
}

/**
 * My Paisa mark.
 *
 * Renders the supplied artwork directly rather than a re-traced approximation,
 * so the logo is exactly as designed. `brand/generate_assets.py` strips the
 * white background and trims the dead space before writing src/assets/logo.png,
 * which is why it sits correctly inside a tile at any size.
 */
export const Logo: React.FC<LogoProps> = ({ className = 'h-10 w-10', size, withTile = false }) => {
  const img = (
    <img
      src={logoUrl}
      alt="My Paisa"
      width={size}
      height={size}
      draggable={false}
      className={withTile ? 'h-[68%] w-[68%] object-contain' : `${className} object-contain shrink-0`}
      style={size && !withTile ? { width: size, height: size } : undefined}
    />
  );

  if (!withTile) return img;

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%]`}
      style={{
        background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF3E6 100%)',
        boxShadow: '0 8px 24px -10px rgba(255,117,31,0.55)',
      }}
    >
      {img}
    </span>
  );
};

/** Wordmark used in headers and the splash. */
export const Wordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-extrabold tracking-tight ${className}`}>
    My<span style={{ color: 'var(--brand)' }}>Paisa</span>
  </span>
);
