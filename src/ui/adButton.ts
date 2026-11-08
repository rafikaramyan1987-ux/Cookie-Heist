import { t } from '../app/i18n';

/** Minimal button shape (a real HTMLButtonElement in the game, a plain object in unit tests). */
export interface AdButton {
  disabled: boolean;
  innerHTML: string;
  textContent: string | null;
}

export const AD_UNAVAILABLE_MS = 2500;

/** A rewarded ad was not available: say so on the button for a moment, then restore it and allow a retry. */
export function adUnavailable(btn: AdButton, label = btn.innerHTML) {
  btn.disabled = true;
  btn.textContent = t('adNotAvailable');
  setTimeout(() => {
    btn.innerHTML = label;
    btn.disabled = false;
  }, AD_UNAVAILABLE_MS);
}
