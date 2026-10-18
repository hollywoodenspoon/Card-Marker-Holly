export const SIZE_PRESETS = [
    { id: 'id', label: 'ID card', widthMm: 86, heightMm: 54, note: 'Default' },
    { id: 'poker', label: 'Poker', widthMm: 63.5, heightMm: 88.9, note: '2.5 × 3.5 in' },
    { id: 'tcg', label: 'Trading card', widthMm: 63, heightMm: 88 },
];
export const DEFAULT_PRESET_ID = 'id';
export function presetSize(id) {
    const p = SIZE_PRESETS.find((s) => s.id === id) ?? SIZE_PRESETS[0];
    return { presetId: p.id, widthMm: p.widthMm, heightMm: p.heightMm };
}
export const orientationOf = (s) => s.widthMm > s.heightMm ? 'landscape' : 'portrait';
export function withOrientation(s, o) {
    if (orientationOf(s) === o || s.widthMm === s.heightMm)
        return s;
    return { ...s, widthMm: s.heightMm, heightMm: s.widthMm };
}
/** The preset matching these dimensions in either orientation, or 'custom'. */
export function matchPreset(widthMm, heightMm) {
    const p = SIZE_PRESETS.find((s) => (s.widthMm === widthMm && s.heightMm === heightMm) ||
        (s.widthMm === heightMm && s.heightMm === widthMm));
    return p ? p.id : 'custom';
}
