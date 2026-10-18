import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Trash2, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { BUILTIN_FONTS, unregisterFont } from '@/assets/fonts';
import { updateLibrary, useEditor } from '@/core/editor/editorStore';
import { uploadFonts } from '@/ui/actions/fontActions';
import { Button, IconButton } from '@/ui/components/ui/button';
export function FontsPanel() {
    const fonts = useEditor((s) => s.library.fonts);
    const list = useMemo(() => Object.values(fonts).sort((a, b) => a.family.localeCompare(b.family) || a.weight.localeCompare(b.weight)), [fonts]);
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-auto", children: [_jsxs("div", { className: "p-3", children: [_jsxs(Button, { variant: "outline", className: "w-full", onClick: uploadFonts, children: [_jsx(Upload, {}), " Upload fonts"] }), _jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "TTF or OTF. Upload each style (Regular, Bold, Italic\u2026) of a family to use real bold and italics." })] }), _jsx("h3", { className: "px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Your fonts" }), list.length ? (_jsx("ul", { className: "px-2", children: list.map((f) => (_jsxs("li", { className: "flex items-center gap-2 rounded-lg px-2 hover:bg-muted", children: [_jsxs("div", { className: "min-w-0 flex-1 py-2", children: [_jsx("div", { className: "truncate text-base", style: { fontFamily: `"${f.family}"`, fontWeight: f.weight, fontStyle: f.style }, children: f.family }), _jsxs("div", { className: "truncate text-xs text-muted-foreground", children: [f.fileName, " \u00B7 ", f.weight, " ", f.style !== 'normal' ? f.style : ''] })] }), _jsx(IconButton, { label: `Delete ${f.fileName}`, size: "icon-sm", onClick: () => {
                                unregisterFont(f.id);
                                updateLibrary((l) => void delete l.fonts[f.id]);
                            }, children: _jsx(Trash2, {}) })] }, f.id))) })) : (_jsx("p", { className: "px-4 py-2 text-sm text-muted-foreground", children: "No uploaded fonts yet." })), _jsx("h3", { className: "px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Built in" }), _jsx("ul", { className: "px-4 pb-4", children: BUILTIN_FONTS.map((f) => (_jsx("li", { className: "py-1.5 text-base", style: { fontFamily: `"${f}"` }, children: f }, f))) })] }));
}
