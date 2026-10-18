import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LeftPanel } from '@/ui/panels/LeftPanel';
import { PropertiesPanel } from '@/ui/panels/PropertiesPanel';
import { TopBar } from '@/ui/toolbar/TopBar';
import { useUi } from '@/ui/uiStore';
import { CanvasArea } from '@/ui/canvas/CanvasArea';
export function DesktopShell() {
    const { leftTab, setLeftTab } = useUi();
    return (_jsxs("div", { className: "h-app flex flex-col", children: [_jsx(TopBar, { layout: "desktop" }), _jsxs("div", { className: "flex min-h-0 flex-1", children: [_jsx("aside", { className: "flex w-[340px] shrink-0 border-r bg-panel", children: _jsx(LeftPanel, { tab: leftTab, onTab: setLeftTab, className: "flex-1" }) }), _jsx("main", { className: "flex min-w-0 flex-1 flex-col", children: _jsx(CanvasArea, { layout: "desktop" }) }), _jsx("aside", { className: "w-[300px] shrink-0 overflow-auto border-l bg-panel", children: _jsx(PropertiesPanel, {}) })] })] }));
}
