import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, Copy, Download, MoreHorizontal, Pencil, Plus, Save, Trash2, Upload, } from 'lucide-react';
import { useMemo, useState } from 'react';
import { registerProjectFonts } from '@/assets/fonts';
import { useEditor } from '@/core/editor/editorStore';
import { currentCard } from '@/core/editor/selectors';
import { cn } from '@/lib/cn';
import { applyBackToAll, applyTemplate, deleteTemplate, downloadTemplate, duplicateTemplate, editTemplate, newTemplate, renameTemplate, saveCurrentCardAsTemplate, uploadTemplate, } from '@/templates/commands';
import { cardsUsingTemplate } from '@/templates/fields';
import { pickFiles } from '@/ui/actions/imageActions';
import { CardThumb } from '@/ui/canvas/CardThumb';
import { Button, IconButton } from '@/ui/components/ui/button';
import { Dialog, DialogContent } from '@/ui/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
import { Input } from '@/ui/components/ui/input';
export function TemplatesPanel({ onPicked }) {
    const templates = useEditor((s) => s.doc?.templates);
    const side = useEditor((s) => s.view.side);
    const [nameDialog, setNameDialog] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const cards = useEditor((s) => s.doc?.cards);
    const usage = deleting && cards ? cardsUsingTemplate(Object.values(cards), deleting.id).length : 0;
    const bySide = useMemo(() => {
        const list = Object.values(templates ?? {}).sort((a, b) => a.createdAt - b.createdAt);
        return {
            front: list.filter((t) => t.side === 'front'),
            back: list.filter((t) => t.side === 'back'),
        };
    }, [templates]);
    const order = side === 'back' ? ['back', 'front'] : ['front', 'back'];
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-auto pb-4", children: [_jsxs("div", { className: "flex flex-wrap gap-2 p-3", children: [_jsxs(Button, { size: "sm", variant: "outline", onClick: () => setNameDialog({
                            title: 'Save this card as a template',
                            initial: `${currentCard(useEditor.getState())?.name ?? 'Card'} layout`,
                            run: (n) => saveCurrentCardAsTemplate(n),
                        }), children: [_jsx(Save, {}), " Save card as template"] }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: async () => {
                            const [f] = await pickFiles('.json,application/json', false);
                            if (!f)
                                return;
                            try {
                                await uploadTemplate(f, registerProjectFonts);
                            }
                            catch (e) {
                                alert(e instanceof Error ? e.message : 'Could not import this file.');
                            }
                        }, children: [_jsx(Upload, {}), " Import"] })] }), order.map((sd) => (_jsxs("section", { children: [_jsxs("div", { className: "flex items-center justify-between px-4 pt-2 pb-1", children: [_jsx("h3", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: sd === 'front' ? 'Fronts' : 'Backs' }), _jsx(IconButton, { label: `New ${sd} template`, size: "icon-sm", onClick: () => newTemplate(sd), children: _jsx(Plus, {}) })] }), _jsxs("ul", { className: "space-y-1 px-2", children: [bySide[sd].map((t) => (_jsx(TemplateRow, { t: t, onPicked: onPicked, onRename: () => setNameDialog({
                                    title: 'Rename template',
                                    initial: t.name,
                                    run: (n) => renameTemplate(t.id, n),
                                }), onDelete: () => setDeleting(t) }, t.id))), !bySide[sd].length && (_jsxs("li", { className: "px-2 py-1 text-sm text-muted-foreground", children: ["No ", sd, " templates yet."] }))] })] }, sd))), _jsx(Dialog, { open: !!nameDialog, onOpenChange: (o) => !o && setNameDialog(null), children: _jsx(DialogContent, { title: nameDialog?.title ?? '', children: nameDialog && (_jsx(NameForm, { initial: nameDialog.initial, onCancel: () => setNameDialog(null), onSave: (n) => {
                            nameDialog.run(n);
                            setNameDialog(null);
                        } })) }) }), _jsx(Dialog, { open: !!deleting, onOpenChange: (o) => !o && setDeleting(null), children: _jsx(DialogContent, { title: "Delete template?", description: usage
                        ? `${usage} card${usage > 1 ? 's use' : ' uses'} “${deleting?.name}”. They will switch to another ${deleting?.side} template. Their field values are kept.`
                        : `“${deleting?.name}” is not used by any card.`, children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleting(null), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: () => {
                                    deleteTemplate(deleting.id);
                                    setDeleting(null);
                                }, children: "Delete" })] }) }) })] }));
}
function TemplateRow({ t, onPicked, onRename, onDelete, }) {
    const card = useEditor(currentCard);
    const editing = useEditor((s) => s.view.mode === 'template' && s.view.templateId === t.id);
    const count = useEditor((s) => s.doc ? cardsUsingTemplate(Object.values(s.doc.cards), t.id).length : 0);
    const inUse = card && (t.side === 'front' ? card.frontTemplateId : card.backTemplateId) === t.id;
    return (_jsxs("li", { className: cn('flex items-center gap-2 rounded-lg p-1.5', editing ? 'bg-accent-soft' : 'hover:bg-muted'), children: [_jsxs("button", { type: "button", className: "flex min-w-0 flex-1 items-center gap-2.5 text-left", onClick: () => {
                    applyTemplate(t.id);
                    onPicked?.();
                }, title: "Use for this card", children: [_jsx(CardThumb, { template: t, side: t.side, heightPx: 44 }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-center gap-1 truncate text-sm font-medium", children: [t.name, inUse && (_jsx(Check, { className: "size-3.5 shrink-0 text-accent", "aria-label": "Used by this card" }))] }), _jsxs("span", { className: "block text-xs text-muted-foreground", children: [count, " card", count === 1 ? '' : 's'] })] })] }), _jsx(IconButton, { label: `Edit ${t.name}`, size: "icon-sm", onClick: () => {
                    editTemplate(t.id);
                    onPicked?.();
                }, children: _jsx(Pencil, {}) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: `Options for ${t.name}`, size: "icon-sm", children: _jsx(MoreHorizontal, {}) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsxs(DropdownMenuItem, { onSelect: () => applyTemplate(t.id), children: [_jsx(Check, {}), " Use for this card"] }), t.side === 'back' && (_jsxs(DropdownMenuItem, { onSelect: () => applyBackToAll(t.id), children: [_jsx(Check, {}), " Use as back for all cards"] })), _jsxs(DropdownMenuItem, { onSelect: onRename, children: [_jsx(Pencil, {}), " Rename"] }), _jsxs(DropdownMenuItem, { onSelect: () => duplicateTemplate(t.id), children: [_jsx(Copy, {}), " Duplicate"] }), _jsxs(DropdownMenuItem, { onSelect: () => void downloadTemplate(t.id), children: [_jsx(Download, {}), " Export file"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { danger: true, onSelect: onDelete, children: [_jsx(Trash2, {}), " Delete"] })] })] })] }));
}
function NameForm({ initial, onSave, onCancel, }) {
    const [name, setName] = useState(initial);
    return (_jsxs("form", { className: "flex flex-col gap-4", onSubmit: (e) => {
            e.preventDefault();
            onSave(name.trim() || initial);
        }, children: [_jsx(Input, { value: name, onChange: (e) => setName(e.target.value), autoFocus: true, "aria-label": "Name" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", children: "Save" })] })] }));
}
