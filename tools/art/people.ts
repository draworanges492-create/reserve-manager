// People on the map (ranger, visitor) at 2× detail (DECISIONS D106): 24×24 world px,
// facing right, two walk frames, outlined so they read against any ground (D13).
import { type Frame } from './animals';
import { dot, ellipse, fill, limb, type Ramp, shaded } from './svg';

interface Outfit {
  shirt: Ramp;
  trousers: Ramp;
  /** Shorts stop at the knee and show skin below. */
  shorts?: boolean;
  hat: Ramp;
  skin: Ramp;
  boots: string;
  /** Small extra on the chest (neckerchief, camera). */
  accent: string;
}

function person(o: Outfit, frame: Frame): string {
  const a = frame === 0;
  const legs = (x: number, foot: number, back: boolean): string => {
    const t = back ? o.trousers.dark : o.trousers.mid;
    const upper = limb(`M${x},13.4 L${(x + foot) / 2},17.4`, t, 1.4, 0);
    const lower = limb(`M${(x + foot) / 2},17.4 L${foot},20.8`, o.shorts ? o.skin.mid : t, 1.25, 0);
    return upper + lower + fill(ellipse(foot + 0.4, 21.2, 1.1, 0.6), o.boots);
  };
  const arm = (shoulderX: number, hand: number, back: boolean): string =>
    limb(
      `M${shoulderX},8.8 L${(shoulderX + hand) / 2},11`,
      back ? o.shirt.dark : o.shirt.mid,
      1.2,
      0,
    ) + limb(`M${(shoulderX + hand) / 2},11 L${hand},13.2`, back ? o.skin.dark : o.skin.mid, 1, 0);
  return [
    arm(9.2, a ? 8.6 : 9.4, true),
    legs(11.2, a ? 13 : 9.8, true),
    legs(12.6, a ? 10.6 : 13.6, false),
    // Torso with a belt, collar and the outfit's accent.
    shaded(
      'M9.6,8.4 C9.8,7.4 10.8,7 12,7 C13.2,7 14.2,7.4 14.4,8.4 L14.7,13.8 L9.3,13.8 Z',
      o.shirt,
      {
        rim: [0.6, 0],
        light: 'M9.8,8.2 C10,7.5 10.8,7.2 11.4,7.2 L10.6,13.4 L9.6,13.4 Z',
        extra:
          fill('M9,13 L15,13 L15,13.8 L9,13.8 Z', '#3a2a1c') +
          fill('M11.2,7 L12.8,7 L12,8.6 Z', o.accent) +
          dot(12.9, 10, 0.3, o.shirt.dark),
      },
    ),
    arm(14.4, a ? 15.2 : 14.6, false),
    // Head: face, ear, eye, then the hat.
    shaded(ellipse(12.2, 5.4, 1.85, 2), o.skin, { light: ellipse(11.6, 4.8, 0.7, 0.8) }),
    dot(11.2, 5.6, 0.45, o.skin.dark),
    dot(13.3, 5.2, 0.28, '#1e1610'),
    limb('M13.2,6.6 L13.8,6.5', o.skin.dark, 0.25, 0),
    fill(ellipse(12.1, 3.8, 3.4, 0.75), o.hat.dark),
    shaded('M10.2,3.8 C10.2,2 11,1.4 12.2,1.4 C13.4,1.4 14.2,2 14.2,3.8 Z', o.hat, {
      light: ellipse(11.4, 2.2, 0.8, 0.4),
    }),
    fill(
      'M10.2,3.2 L14.2,3.2 L14.2,3.8 L10.2,3.8 Z',
      o.accent === '#c2402f' ? '#3a2a1c' : o.hat.dark,
    ),
  ].join('');
}

const SKIN_DARK: Ramp = { light: '#a86e48', mid: '#8a5a3a', dark: '#663f26' };
const SKIN_LIGHT: Ramp = { light: '#f0c8a2', mid: '#dcaa82', dark: '#b4825e' };

export function ranger(frame: Frame): string {
  return person(
    {
      shirt: { light: '#e2cc92', mid: '#c9ad6c', dark: '#9a824e' },
      trousers: { light: '#5e7448', mid: '#4b5e3a', dark: '#36452a' },
      hat: { light: '#a08a58', mid: '#867246', dark: '#665634' },
      skin: SKIN_DARK,
      boots: '#2e241c',
      accent: '#c2402f',
    },
    frame,
  );
}

export function visitor(frame: Frame): string {
  return person(
    {
      shirt: { light: '#6aa6e4', mid: '#3d7fc6', dark: '#2a5c96' },
      trousers: { light: '#e6d6b0', mid: '#cdb98e', dark: '#a8946a' },
      shorts: true,
      hat: { light: '#ffffff', mid: '#eeeae0', dark: '#c8c2b4' },
      skin: SKIN_LIGHT,
      boots: '#6a4a32',
      accent: '#26221e',
    },
    frame,
  );
}
