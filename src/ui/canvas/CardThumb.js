import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { assetResolver } from '@/assets/assetResolver';
import { useEditor } from '@/core/editor/editorStore';
import { StaticCard } from '@/core/render/StaticCard';
import { cn } from '@/lib/cn';
import { resolveSide } from '@/templates/resolve';
import { useRenderVersion } from './useRenderVersion';
/** Renders only once scrolled into view. */
function useVisible() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), {
            rootMargin: '200px',
        });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return { ref, visible };
}
/** Live thumbnail of a card side, or of a template (with its defaults) when no card is given. */
export function CardThumb({ card, template, side, heightPx, className, }) {
    const templates = useEditor((s) => s.doc?.templates);
    const t = template ??
        (card
            ? templates?.[(side === 'front' ? card.frontTemplateId : card.backTemplateId) ?? '']
            : undefined);
    const version = useRenderVersion();
    const nodes = useMemo(() => resolveSide(t, card, side, 'card'), [t, card, side]);
    const { ref, visible } = useVisible();
    const size = t?.size ?? useEditor.getState().doc?.project.defaultSize;
    if (!size)
        return null;
    const widthPx = Math.round((heightPx * size.widthMm) / size.heightMm);
    return (_jsx("span", { ref: ref, "aria-hidden": true, className: cn('block shrink-0 overflow-hidden rounded-[3px] bg-white shadow-sm ring-1 ring-black/10', className), style: { width: widthPx, height: heightPx }, children: visible && t && (_jsx(StaticCard, { nodes: nodes, widthMm: size.widthMm, heightMm: size.heightMm, widthPx: widthPx, assets: assetResolver, renderVersion: version })) }));
}
