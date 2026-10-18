import { useSyncExternalStore } from 'react';
const KEY = 'cardmaker.theme';
const listeners = new Set();
function read() {
    try {
        const v = localStorage.getItem(KEY);
        if (v === 'light' || v === 'dark' || v === 'system')
            return v;
    }
    catch {
        /* storage unavailable */
    }
    return 'system';
}
let current = typeof window === 'undefined' ? 'system' : read();
const media = typeof window === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');
function apply() {
    const dark = current === 'dark' || (current === 'system' && !!media?.matches);
    document.documentElement.classList.toggle('dark', dark);
}
media?.addEventListener('change', () => {
    if (current === 'system')
        apply();
    listeners.forEach((l) => l());
});
export function setTheme(t) {
    current = t;
    try {
        localStorage.setItem(KEY, t);
    }
    catch {
        /* ignore */
    }
    apply();
    listeners.forEach((l) => l());
}
export function initTheme() {
    apply();
}
function subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
}
export function useThemeSetting() {
    return useSyncExternalStore(subscribe, () => current);
}
/** Whether the dark theme is currently applied. */
export function useIsDark() {
    return useSyncExternalStore(subscribe, () => current === 'dark' || (current === 'system' && !!media?.matches));
}
