import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Images, Layers, Plus, SlidersHorizontal, SquareStack } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Sheet } from '@/ui/components/ui/sheet';
import { PanelBody } from '@/ui/panels/PanelBody';
import { PropertiesPanel } from '@/ui/panels/PropertiesPanel';
import { AddGrid } from '@/ui/toolbar/AddMenu';
import { TopBar } from '@/ui/toolbar/TopBar';
import { useUi } from '@/ui/uiStore';
import { CanvasArea } from '@/ui/canvas/CanvasArea';
const TOOLS = [
    { id: 'cards', label: 'Cards', icon: SquareStack },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'assets', label: 'Assets', icon: Images },
    { id: 'properties', label: 'Edit', icon: SlidersHorizontal },
];
const TITLES = {
    cards: 'Cards',
    templates: 'Templates',
    layers: 'Layers',
    add: 'Add',
    assets: 'Assets',
    fonts: 'Fonts',
    properties: 'Properties',
};
export function PhoneShell() {
    const { phoneSheet, setPhoneSheet } = useUi();
    return (_jsxs("div", { className: "h-app flex flex-col", children: [_jsx(TopBar, { layout: "phone" }), _jsx("main", { className: "relative flex min-h-0 flex-1 flex-col", children: _jsx(CanvasArea, { layout: "phone" }) }), _jsx("nav", { "aria-label": "Tools", className: "pb-safe flex shrink-0 items-stretch justify-around border-t bg-panel", children: TOOLS.map((t) => (_jsxs("button", { type: "button", onClick: () => setPhoneSheet(phoneSheet === t.id ? null : t.id), "aria-pressed": phoneSheet === t.id, className: cn('flex h-16 min-w-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground', phoneSheet === t.id && 'text-accent'), children: [_jsx(t.icon, { className: cn('size-5', t.id === 'add' && 'size-6') }), t.label] }, t.id))) }), _jsx(Sheet, { open: phoneSheet !== null, onOpenChange: (o) => !o && setPhoneSheet(null), side: "bottom", title: phoneSheet ? TITLES[phoneSheet] : '', children: phoneSheet === 'add' ? (_jsx(AddGrid, { onDone: () => setPhoneSheet(null) })) : phoneSheet === 'properties' ? (_jsx(PropertiesPanel, {})) : phoneSheet ? (_jsx(PanelBody, { id: phoneSheet, onPicked: () => setPhoneSheet(null) })) : null })] }));
}
