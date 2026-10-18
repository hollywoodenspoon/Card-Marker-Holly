import { describe, expect, it } from 'vitest';
import { ptToMm } from '../units/units';
import { layoutText } from './layout';
import { DEFAULT_TEXT_STYLE, richTextFromPlain } from './richtext';
/** Every character is 0.5 × font size wide; bold is 0.6. */
const fake = {
    width: (t, s, size) => [...t].length * size * (s.bold ? 0.6 : 0.5),
    metrics: (_s, size) => ({ ascent: size * 0.8, descent: size * 0.2 }),
};
// 10pt ≈ 3.528 mm → each char ≈ 1.764 mm
const size = ptToMm(10);
const cw = size * 0.5;
const base = (text, over = {}) => ({
    text: richTextFromPlain(text),
    baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 10 },
    align: 'left',
    lineHeight: 1.2,
    vAlign: 'top',
    width: cw * 10, // 10 characters per line
    height: 100,
    ...over,
});
describe('layoutText', () => {
    it('wraps at word boundaries', () => {
        const l = layoutText(base('hello world foo'), fake);
        expect(l.lines.map((x) => x.fragments.map((f) => f.text).join(''))).toEqual([
            'hello',
            'world foo',
        ]);
        expect(l.lines[1].y).toBeCloseTo(size * 1.2);
        expect(l.height).toBeCloseTo(size * 1.2 * 2);
    });
    it('keeps paragraphs on separate lines', () => {
        const l = layoutText(base('a\n\nb'), fake);
        expect(l.lines).toHaveLength(3);
    });
    it('breaks words longer than the line', () => {
        const l = layoutText(base('abcdefghijklmno'), fake);
        expect(l.lines.map((x) => x.fragments.map((f) => f.text).join(''))).toEqual([
            'abcdefghij',
            'klmno',
        ]);
        expect(l.overflow).toBe(true);
    });
    it('aligns centre and right', () => {
        const c = layoutText(base('abcd', { align: 'center' }), fake);
        expect(c.lines[0].fragments[0].x).toBeCloseTo(cw * 3);
        const r = layoutText(base('abcd', { align: 'right' }), fake);
        expect(r.lines[0].fragments[0].x).toBeCloseTo(cw * 6);
    });
    it('justifies all but the last line', () => {
        const l = layoutText(base('aa bb cc dd ee', { align: 'justify' }), fake);
        expect(l.lines[0].width).toBeCloseTo(cw * 10);
        const last = l.lines[l.lines.length - 1];
        expect(last.width).toBeLessThan(cw * 10);
    });
    it('positions the baseline with half-leading', () => {
        const l = layoutText(base('x'), fake);
        // line height 1.2·s, glyph box 1.0·s → half leading 0.1·s, baseline at 0.1s + 0.8s
        expect(l.lines[0].baseline).toBeCloseTo(size * 0.9);
    });
    it('applies vertical alignment', () => {
        const l = layoutText(base('x', { vAlign: 'bottom', height: 20 }), fake);
        expect(l.offsetY).toBeCloseTo(20 - size * 1.2);
    });
    it('respects per-run styles', () => {
        const input = base('', { width: 100 });
        input.text = {
            paragraphs: [{ runs: [{ text: 'ab' }, { text: 'cd', style: { bold: true, sizePt: 20 } }] }],
        };
        const l = layoutText(input, fake);
        const [a, b] = l.lines[0].fragments;
        expect(a.width).toBeCloseTo(2 * cw);
        expect(b.x).toBeCloseTo(2 * cw);
        expect(b.width).toBeCloseTo(2 * ptToMm(20) * 0.6);
        expect(l.lines[0].height).toBeCloseTo(ptToMm(20) * 1.2);
    });
    it('adds letter spacing per character', () => {
        const input = base('ab', { width: 100 });
        input.baseStyle = { ...input.baseStyle, letterSpacingEm: 0.1 };
        const l = layoutText(input, fake);
        expect(l.lines[0].width).toBeCloseTo(2 * cw + 2 * 0.1 * size);
    });
});
describe('auto-shrink', () => {
    const long = 'one two three four five six seven eight nine ten';
    it('does nothing when the text fits', () => {
        const l = layoutText(base('short', { height: 10, autoShrink: { enabled: true, minPt: 4 } }), fake);
        expect(l.scale).toBe(1);
    });
    it('shrinks until the text fits the box', () => {
        const height = size * 1.2 * 2; // room for two lines at full size
        const l = layoutText(base(long, { height, autoShrink: { enabled: true, minPt: 2 } }), fake);
        expect(l.scale).toBeLessThan(1);
        expect(l.height).toBeLessThanOrEqual(height + 1e-6);
        expect(l.overflow).toBe(false);
        // and it is the largest scale that fits (within search precision)
        const bigger = layoutText({
            ...base(long, { height }),
            baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 10 * l.scale * 1.02 },
        }, fake);
        expect(bigger.height).toBeGreaterThan(height);
    });
    it('stops at the minimum size and reports overflow', () => {
        const l = layoutText(base(long, { height: 1, autoShrink: { enabled: true, minPt: 8 } }), fake);
        expect(l.scale).toBeCloseTo(0.8);
        expect(l.overflow).toBe(true);
    });
    it('does not shrink when disabled', () => {
        const l = layoutText(base(long, { height: 1 }), fake);
        expect(l.scale).toBe(1);
        expect(l.overflow).toBe(true);
    });
});
