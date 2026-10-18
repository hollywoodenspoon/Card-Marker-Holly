import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Home, Menu, PanelLeft, PanelRight, Redo2, Undo2 } from 'lucide-react';
import { goHome } from '@/app/session';
import { redo, undo, useEditor } from '@/core/editor/editorStore';
import { IconButton } from '@/ui/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu';
import { useUi } from '@/ui/uiStore';
import { AddMenu } from './AddMenu';
import { ModeSwitch } from './ModeSwitch';
import { ProjectName } from './ProjectName';
import { SaveIndicator } from './SaveIndicator';
export function TopBar({ layout }) {
    const { setLeftOpen, setRightOpen } = useUi();
    const canUndo = useEditor((s) => s.canUndo);
    const canRedo = useEditor((s) => s.canRedo);
    const phone = layout === 'phone';
    return (_jsx("header", { className: "pt-safe pl-safe pr-safe flex shrink-0 items-center border-b bg-panel", children: _jsxs("div", { className: "flex h-14 min-w-0 flex-1 items-center gap-1 px-2 md:h-12", children: [layout === 'tablet' && (_jsx(IconButton, { label: "Open panels", onClick: () => setLeftOpen(true), children: _jsx(PanelLeft, {}) })), _jsx(AppMenu, {}), _jsx(ProjectName, { className: phone ? 'max-w-[38vw]' : undefined }), _jsx(SaveIndicator, { compact: phone }), _jsx("div", { className: "flex-1" }), !phone && (_jsxs("div", { className: "flex items-center gap-2 px-2", children: [_jsx(ModeSwitch, {}), _jsx(AddMenu, {})] })), _jsx("div", { className: "flex-1" }), _jsx(IconButton, { label: "Undo", disabled: !canUndo, onClick: undo, children: _jsx(Undo2, {}) }), _jsx(IconButton, { label: "Redo", disabled: !canRedo, onClick: redo, children: _jsx(Redo2, {}) }), layout === 'tablet' && (_jsx(IconButton, { label: "Open properties", onClick: () => setRightOpen(true), children: _jsx(PanelRight, {}) }))] }) }));
}
function AppMenu() {
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: "Menu", children: _jsx(Menu, {}) }) }), _jsxs(DropdownMenuContent, { align: "start", children: [_jsxs(DropdownMenuItem, { onSelect: () => void goHome(), children: [_jsx(Home, {}), " All projects"] }), _jsx(DropdownMenuSeparator, {}), _jsx(ThemeMenuItems, {})] })] }));
}
