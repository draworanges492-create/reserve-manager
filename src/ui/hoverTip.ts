// The tooltip for whichever HUD control the pointer is over (buttons register here).
type Provider = () => string[];

let current: Provider | null = null;

export function setHoverTip(provider: Provider): void {
  current = provider;
}

export function clearHoverTip(provider: Provider): void {
  if (current === provider) current = null;
}

export function hoverTipLines(): string[] {
  return current ? current() : [];
}
