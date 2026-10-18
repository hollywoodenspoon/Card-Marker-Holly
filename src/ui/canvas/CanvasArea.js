import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Eye, EyeOff, Magnet, Maximize, Minus, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { assetResolver } from '@/assets/assetResolver';
import { CardStage } from '@/core/render/CardStage';
import { setView, useEditor } from '@/core/editor/editorStore';
import { activeTemplate, currentCard } from '@/core/editor/selectors';
import { fitToScreen, useViewport, zoomIn, zoomOut } from '@/core/render/viewport';
import { cn } from '@/lib/cn';
import { resolveSide } from '@/templates/resolve';
import { IconButton } from '@/ui/components/ui/button';
import { useCoarsePointer } from '@/ui/shell/useLayout';
import { useIsDark } from '@/ui/theme/theme';
import { screenToMm } from '@/core/render/viewport';
import { setImageFieldValue } from '@/templates/fieldCommands';
import { importAndPlace } from '@/ui/actions/imageActions';
import { CanvasHeader } from './CanvasHeader';
import { TextEditOverlay } from './TextEditOverlay';
import { useRenderVersion } from './useRenderVersion';
export function CanvasArea({ layout }) {
    const doc = useEditor((s) => s.doc);
    const view = useEditor((s) => s.view);
    const renderVersion = useRenderVersion();
    const dark = useIsDark();
    const coarse = useCoarsePointer();
    const state = useEditor.getState();
    const template = doc ? activeTemplate({ ...state, doc, view }) : undefined;
    const card = doc ? currentCard({ ...state, doc, view }) : undefined;
    const nodes = useMemo(() => resolveSide(template, card, view.side, view.mode), [template, card, view.side, view.mode]);
    if (!doc)
        return null;
    const size = template?.size ?? doc.project.defaultSize;
    return (_jsxs("div", { className: "relative min-h-0 flex-1 overflow-hidden bg-canvas", onDragOver: (e) => {
            if ([...e.dataTransfer.items].some((i) => i.kind === 'file'))
                e.preventDefault();
        }, onDrop: (e) => {
            e.preventDefault();
            const files = [...e.dataTransfer.files];
            if (!files.length)
                return;
            const r = e.currentTarget.getBoundingClientRect();
            const at = screenToMm(e.clientX - r.left, e.clientY - r.top);
            const intoField = dropTarget(at);
            void importAndPlace(files, intoField ? undefined : at, !intoField);
        }, children: [template ? (_jsx(CardStage, { nodes: nodes, widthMm: size.widthMm, heightMm: size.heightMm, bleedMm: doc.project.bleedMm, safeMm: doc.project.safeMm, guides: template.guides, assets: assetResolver, renderVersion: renderVersion, dark: dark, coarse: coarse, onTextEdit: (id) => setView({ editingTextId: id, selection: [id] }), onImageEdit: (id) => setView({ cropId: id, selection: [id] }), onImageFieldFrame: (id, patch) => setImageFieldValue(id, patch, 'frame:' + id) })) : (_jsx("div", { className: "grid h-full place-items-center p-6 text-center text-sm text-white/90", children: card
                    ? 'This side has no template. Pick one in the Templates panel.'
                    : 'No card selected.' })), _jsx(CanvasHeader, { phone: layout === 'phone' }), _jsx(TextEditOverlay, { phone: layout === 'phone' }), _jsx(ViewControls, { compact: layout === 'phone' })] }));
}
/**
 * Dropping onto an image field fills it: select the frame under the pointer
 * and return true so the image goes into it instead of floating free.
 */
function dropTarget(at) {
    const s = useEditor.getState();
    const all = [
        ...(activeTemplate(s)?.elements ?? []),
        ...(s.view.mode === 'card' ? (currentCard(s)?.local[s.view.side] ?? []) : []),
    ];
    const hit = [...all]
        .reverse()
        .find((e) => e.type === 'imageField' &&
        at.x >= e.xMm &&
        at.x <= e.xMm + e.wMm &&
        at.y >= e.yMm &&
        at.y <= e.yMm + e.hMm);
    if (hit)
        setView({ selection: [hit.id] });
    return !!hit;
}
function ViewControls({ compact }) {
    const zoom = useViewport((s) => s.zoom);
    const showOverlay = useEditor((s) => s.view.showOverlay);
    const snapping = useEditor((s) => s.view.snapping);
    return (_jsxs("div", { className: cn('absolute right-3 bottom-3 flex items-center gap-0.5 rounded-xl border bg-panel/95 p-1 shadow-md backdrop-blur'), children: [_jsx(IconButton, { label: showOverlay ? 'Hide bleed and safe area' : 'Show bleed and safe area', size: "icon-sm", active: showOverlay, onClick: () => setView({ showOverlay: !showOverlay }), children: showOverlay ? _jsx(Eye, {}) : _jsx(EyeOff, {}) }), _jsx(IconButton, { label: snapping ? 'Turn snapping off' : 'Turn snapping on', size: "icon-sm", active: snapping, onClick: () => setView({ snapping: !snapping }), children: _jsx(Magnet, {}) }), _jsx("span", { className: "mx-0.5 h-5 w-px bg-border" }), !compact && (_jsx(IconButton, { label: "Zoom out", size: "icon-sm", onClick: zoomOut, children: _jsx(Minus, {}) })), _jsxs("button", { type: "button", onClick: () => fitToScreen(), className: "h-11 min-w-12 rounded-md px-1 text-xs font-medium tabular-nums hover:bg-muted md:h-8", title: "Fit to screen", children: [Math.round(zoom * 100), "%"] }), !compact && (_jsx(IconButton, { label: "Zoom in", size: "icon-sm", onClick: zoomIn, children: _jsx(Plus, {}) })), _jsx(IconButton, { label: "Fit to screen", size: "icon-sm", onClick: () => fitToScreen(), children: _jsx(Maximize, {}) })] }));
}
