// Crash screen (D142): if something breaks, show a calm message and a Reload button instead
// of a frozen canvas. Plain HTML, so it works even when Phaser itself is the problem.
import { t } from '../core/text';

let shown = false;

/** Shows the crash screen once. Stops the game first so no broken state gets autosaved. */
export function showCrashScreen(detail: string, stop: () => void): void {
  if (shown) return;
  shown = true;
  try {
    stop();
  } catch {
    // Already broken; the overlay still helps.
  }
  const box = document.createElement('div');
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-labelledby', 'crash-title');
  box.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(14,11,8,0.92);z-index:1000;font-family:Inter,system-ui,sans-serif;';
  const card = document.createElement('div');
  card.style.cssText =
    'max-width:420px;margin:16px;padding:20px 24px;background:#241c16;border:1px solid #6a4a32;' +
    'color:#e8d9a8;border-radius:4px;text-align:center;line-height:1.45;';
  const title = document.createElement('h1');
  title.id = 'crash-title';
  title.textContent = t('crash.title');
  title.style.cssText = 'font-size:20px;margin:0 0 8px;';
  const body = document.createElement('p');
  body.textContent = t('crash.body');
  body.style.cssText = 'margin:0 0 16px;font-size:14px;';
  const button = document.createElement('button');
  button.textContent = t('crash.reload');
  button.style.cssText =
    'font:inherit;font-size:14px;padding:8px 18px;background:#8b5a3c;color:#e8d9a8;' +
    'border:1px solid #e8d9a8;border-radius:3px;cursor:pointer;';
  button.addEventListener('click', () => window.location.reload());
  const small = document.createElement('p');
  small.textContent = detail.slice(0, 200);
  small.style.cssText = 'margin:16px 0 0;font-size:11px;opacity:0.7;word-break:break-word;';
  card.append(title, body, button, small);
  box.append(card);
  document.body.append(box);
  button.focus();
}

/** Errors from browser extensions or other sites aren't ours to report. */
function isOurs(filename: string | undefined): boolean {
  return !filename || filename.startsWith(window.location.origin);
}

export function installCrashScreen(stop: () => void): void {
  window.addEventListener('error', (e) => {
    if (isOurs(e.filename)) showCrashScreen(String(e.message), stop);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason: unknown = e.reason;
    showCrashScreen(reason instanceof Error ? reason.message : String(reason), stop);
  });
}
