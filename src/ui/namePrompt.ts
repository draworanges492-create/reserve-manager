// The "what's your name?" overlay before a new game (spec §8: player named at start).
// Plain HTML rather than canvas text, so typing, editing and screen readers just work.
import { t } from '../core/text';
import { UI_FONT } from './crispText';

const MAX_LENGTH = 16;

export function askPlayerName(parent: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#120d09cc;z-index:10;';
    const panel = document.createElement('form');
    panel.style.cssText = `font-family:${UI_FONT};color:#e8d9a8;background:#241c16;border:2px solid #6a4a32;padding:24px 28px;max-width:min(420px,calc(100vw - 32px));box-sizing:border-box;text-align:center;`;
    const title = document.createElement('h1');
    title.textContent = t('name.title');
    title.style.cssText = 'margin:0 0 8px;font-size:28px;';
    const prompt = document.createElement('label');
    prompt.textContent = t('name.prompt');
    prompt.htmlFor = 'player-name';
    prompt.style.cssText = 'display:block;margin-bottom:14px;font-size:17px;line-height:1.35;';
    const input = document.createElement('input');
    input.id = 'player-name';
    input.maxLength = MAX_LENGTH;
    input.placeholder = t('name.placeholder');
    input.autocomplete = 'off';
    input.style.cssText = `font-family:${UI_FONT};font-size:20px;padding:6px 10px;width:100%;box-sizing:border-box;background:#120d09;color:#e8d9a8;border:1px solid #8b5a3c;`;
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = t('name.begin');
    button.style.cssText = `font-family:${UI_FONT};font-size:18px;margin-top:14px;padding:6px 22px;background:#8b5a3c;color:#e8d9a8;border:1px solid #e8d9a8;cursor:pointer;`;
    panel.append(title, prompt, input, button);
    overlay.append(panel);
    parent.append(overlay);
    input.focus();
    panel.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim().slice(0, MAX_LENGTH) || t('name.default');
      overlay.remove();
      resolve(name);
    });
  });
}
