import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Menu, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createAndOpenProject, openProject } from '@/app/session';
import { SIZE_PRESETS } from '@/core/units/presets';
import { deleteProject, listProjects, renameProject } from '@/storage/repo';
import { Button, IconButton } from '@/ui/components/ui/button';
import { Dialog, DialogContent } from '@/ui/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
import { Input, Label, NativeSelect } from '@/ui/components/ui/input';
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu';
export function HomeScreen() {
    const [projects, setProjects] = useState(null);
    const [creating, setCreating] = useState(false);
    const [renaming, setRenaming] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const refresh = () => listProjects().then(setProjects);
    useEffect(() => {
        void refresh();
    }, []);
    return (_jsxs("div", { className: "h-app pt-safe pb-safe flex flex-col overflow-auto", children: [_jsxs("header", { className: "flex h-14 shrink-0 items-center gap-2 border-b bg-panel px-3", children: [_jsx("img", { src: "/icon.svg", alt: "", className: "size-7" }), _jsx("span", { className: "text-sm font-semibold", children: "Card Maker" }), _jsx("div", { className: "flex-1" }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: "Settings", children: _jsx(Menu, {}) }) }), _jsx(DropdownMenuContent, { align: "end", children: _jsx(ThemeMenuItems, {}) })] })] }), _jsx("main", { className: "mx-auto w-full max-w-4xl flex-1 px-4 py-8", children: projects && projects.length === 0 ? (_jsxs("div", { className: "mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 text-center", children: [_jsx("div", { className: "grid size-16 place-items-center rounded-2xl bg-accent-soft", children: _jsx("img", { src: "/icon.svg", alt: "", className: "size-10" }) }), _jsx("h1", { className: "text-xl font-semibold", children: "Design your first card" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Start with an 86 \u00D7 54 mm card and a ready-made layout. Fill in a name, drop in some art, and you're done. Everything is saved in this browser." }), _jsxs(Button, { onClick: () => createAndOpenProject('My card game'), className: "w-full sm:w-auto", children: [_jsx(Plus, {}), " Start a new project"] }), _jsx(Button, { variant: "ghost", onClick: () => setCreating(true), children: "Choose a different card size\u2026" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-5 flex items-center justify-between gap-3", children: [_jsx("h1", { className: "text-lg font-semibold", children: "Projects" }), _jsxs(Button, { onClick: () => setCreating(true), children: [_jsx(Plus, {}), " New project"] })] }), _jsx("ul", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", children: projects?.map((p) => (_jsxs("li", { className: "flex items-center gap-1 rounded-xl border bg-panel p-1 pl-3", children: [_jsxs("button", { type: "button", onClick: () => openProject(p.id), className: "flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center text-left", children: [_jsx("span", { className: "w-full truncate text-sm font-medium", children: p.name }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [p.defaultSize.widthMm, " \u00D7 ", p.defaultSize.heightMm, " mm \u00B7 edited", ' ', new Date(p.updatedAt).toLocaleDateString()] })] }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: `Options for ${p.name}`, children: _jsx(MoreHorizontal, {}) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsxs(DropdownMenuItem, { onSelect: () => setRenaming(p), children: [_jsx(Pencil, {}), " Rename"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { danger: true, onSelect: () => setDeleting(p), children: [_jsx(Trash2, {}), " Delete"] })] })] })] }, p.id))) })] })) }), _jsx(NewProjectDialog, { open: creating, onOpenChange: setCreating }), _jsx(RenameDialog, { project: renaming, onClose: () => setRenaming(null), onDone: async (name) => {
                    if (renaming)
                        await renameProject(renaming.id, name);
                    setRenaming(null);
                    void refresh();
                } }), _jsx(Dialog, { open: !!deleting, onOpenChange: (o) => !o && setDeleting(null), children: _jsx(DialogContent, { title: "Delete project?", description: `“${deleting?.name}” and all its cards, templates, images and fonts will be removed from this browser.`, children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleting(null), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: async () => {
                                    if (deleting)
                                        await deleteProject(deleting.id);
                                    setDeleting(null);
                                    void refresh();
                                }, children: "Delete" })] }) }) })] }));
}
function NewProjectDialog({ open, onOpenChange, }) {
    const [name, setName] = useState('My card game');
    const [preset, setPreset] = useState('id');
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsx(DialogContent, { title: "New project", description: "You can change the card size later.", children: _jsxs("form", { className: "flex flex-col gap-4", onSubmit: (e) => {
                    e.preventDefault();
                    void createAndOpenProject(name.trim() || 'Untitled', preset);
                }, children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { htmlFor: "np-name", children: "Name" }), _jsx(Input, { id: "np-name", value: name, onChange: (e) => setName(e.target.value), autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { htmlFor: "np-size", children: "Card size" }), _jsx(NativeSelect, { id: "np-size", value: preset, onChange: (e) => setPreset(e.target.value), children: SIZE_PRESETS.map((p) => (_jsxs("option", { value: p.id, children: [p.label, " \u2014 ", p.widthMm, " \u00D7 ", p.heightMm, " mm"] }, p.id))) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Create" })] })] }) }) }));
}
function RenameDialog({ project, onClose, onDone, }) {
    return (_jsx(Dialog, { open: !!project, onOpenChange: (o) => !o && onClose(), children: _jsx(DialogContent, { title: "Rename project", children: project && (_jsx(RenameForm, { initial: project.name, onClose: onClose, onDone: onDone }, project.id)) }) }));
}
function RenameForm({ initial, onClose, onDone, }) {
    const [name, setName] = useState(initial);
    return (_jsxs("form", { className: "flex flex-col gap-4", onSubmit: (e) => {
            e.preventDefault();
            onDone(name.trim() || 'Untitled');
        }, children: [_jsx(Input, { value: name, onChange: (e) => setName(e.target.value), autoFocus: true, "aria-label": "Project name" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { type: "submit", children: "Save" })] })] }));
}
