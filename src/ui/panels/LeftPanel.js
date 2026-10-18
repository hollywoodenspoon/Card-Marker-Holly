import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/cn';
import { LEFT_PANELS } from './panelIds';
import { PanelBody } from './PanelBody';
/** Vertical icon rail + the active panel. Used on desktop and inside the tablet drawer. */
export function LeftPanel({ tab, onTab, className, }) {
    return (_jsxs("div", { className: cn('flex min-h-0', className), children: [_jsx("nav", { "aria-label": "Panels", className: "flex w-16 shrink-0 flex-col items-center gap-1 border-r py-2", children: LEFT_PANELS.map((p) => (_jsxs("button", { type: "button", onClick: () => onTab(p.id), "aria-pressed": tab === p.id, className: cn('flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted', tab === p.id && 'bg-accent-soft text-accent hover:bg-accent-soft'), children: [_jsx(p.icon, { className: "size-5" }), p.label] }, p.id))) }), _jsx("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col", children: _jsx(PanelBody, { id: tab }) })] }));
}
