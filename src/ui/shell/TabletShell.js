import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sheet } from '@/ui/components/ui/sheet';
import { LeftPanel } from '@/ui/panels/LeftPanel';
import { PropertiesPanel } from '@/ui/panels/PropertiesPanel';
import { TopBar } from '@/ui/toolbar/TopBar';
import { useUi } from '@/ui/uiStore';
import { CanvasArea } from '@/ui/canvas/CanvasArea';
/** Drawers open below the top bar so its controls stay reachable. */
const BELOW_TOPBAR = 'top-[calc(3rem+1px+env(safe-area-inset-top))] shadow-xl';
export function TabletShell() {
    const { leftTab, setLeftTab, leftOpen, setLeftOpen, rightOpen, setRightOpen } = useUi();
    return (_jsxs("div", { className: "h-app flex flex-col", children: [_jsx(TopBar, { layout: "tablet" }), _jsx("main", { className: "flex min-h-0 flex-1 flex-col", children: _jsx(CanvasArea, { layout: "tablet" }) }), _jsx(Sheet, { open: leftOpen, onOpenChange: setLeftOpen, side: "left", title: "Panels", modal: false, className: BELOW_TOPBAR, children: _jsx(LeftPanel, { tab: leftTab, onTab: setLeftTab, className: "h-full" }) }), _jsx(Sheet, { open: rightOpen, onOpenChange: setRightOpen, side: "right", title: "Properties", modal: false, children: _jsx(PropertiesPanel, {}) })] }));
}
