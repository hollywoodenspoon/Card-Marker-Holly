import { useSyncExternalStore } from 'react';
const phoneQ = '(max-width: 767px)';
const desktopQ = '(min-width: 1200px)';
function get() {
    if (matchMedia(phoneQ).matches)
        return 'phone';
    if (matchMedia(desktopQ).matches)
        return 'desktop';
    return 'tablet';
}
function subscribe(cb) {
    const a = matchMedia(phoneQ);
    const b = matchMedia(desktopQ);
    a.addEventListener('change', cb);
    b.addEventListener('change', cb);
    return () => {
        a.removeEventListener('change', cb);
        b.removeEventListener('change', cb);
    };
}
export function useLayout() {
    return useSyncExternalStore(subscribe, get);
}
/** True when the primary pointer is coarse (finger) — used for larger handles. */
export function useCoarsePointer() {
    return useSyncExternalStore((cb) => {
        const m = matchMedia('(pointer: coarse)');
        m.addEventListener('change', cb);
        return () => m.removeEventListener('change', cb);
    }, () => matchMedia('(pointer: coarse)').matches);
}
