import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MoreHorizontal, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { assetResolver } from '@/assets/assetResolver';
import { IMAGE_ACCEPT } from '@/assets/imageAssets';
import { updateLibrary, useEditor } from '@/core/editor/editorStore';
import { usedAssetIds } from '@/core/model/usage';
import { importImages, pickFiles, placeAsset } from '@/ui/actions/imageActions';
import { Button, IconButton } from '@/ui/components/ui/button';
import { Dialog, DialogContent } from '@/ui/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
export function AssetsPanel({ onPicked }) {
    const assets = useEditor((s) => s.library.assets);
    const list = useMemo(() => Object.values(assets).sort((a, b) => b.createdAt - a.createdAt), [assets]);
    const [deleting, setDeleting] = useState(null);
    const doc = useEditor((s) => s.doc);
    const inUse = deleting && doc ? usedAssetIds(doc).has(deleting.id) : false;
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [_jsxs("div", { className: "p-3", children: [_jsxs(Button, { variant: "outline", className: "w-full", onClick: async () => {
                            await importImages(await pickFiles(IMAGE_ACCEPT));
                        }, children: [_jsx(Upload, {}), " Upload images"] }), _jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "PNG, JPG, WebP or SVG. You can also drop or paste images onto the canvas. Tap an image to place it (or to fill the selected art box)." })] }), list.length ? (_jsx("ul", { className: "grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-auto px-3 pb-3 sm:grid-cols-3 lg:grid-cols-2", children: list.map((a) => (_jsxs("li", { className: "group relative overflow-hidden rounded-lg border bg-muted", children: [_jsx("button", { type: "button", onClick: () => {
                                placeAsset(a);
                                onPicked?.();
                            }, className: "block aspect-square w-full", title: `Place ${a.name}`, children: _jsx("img", { src: assetResolver.getUrl(a.id), alt: a.name, className: "size-full object-contain p-1.5", draggable: false }) }), _jsxs("div", { className: "flex items-center gap-1 border-t bg-panel pl-2", children: [_jsx("span", { className: "min-w-0 flex-1 truncate text-xs", children: a.name }), _jsx("span", { className: "text-[10px] text-muted-foreground", children: a.isVector ? 'SVG' : `${a.widthPx}×${a.heightPx}` }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: `Options for ${a.name}`, size: "icon-sm", children: _jsx(MoreHorizontal, {}) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuItem, { onSelect: () => {
                                                        const name = prompt('Rename image', a.name)?.trim();
                                                        if (name)
                                                            updateLibrary((l) => void (l.assets[a.id].name = name));
                                                    }, children: "Rename" }), _jsxs(DropdownMenuItem, { danger: true, onSelect: () => setDeleting(a), children: [_jsx(Trash2, {}), " Delete"] })] })] })] })] }, a.id))) })) : (_jsx("p", { className: "px-4 py-6 text-center text-sm text-muted-foreground", children: "No images yet." })), _jsx(Dialog, { open: !!deleting, onOpenChange: (o) => !o && setDeleting(null), children: _jsx(DialogContent, { title: "Delete image?", description: inUse
                        ? 'This image is used on cards or templates. Those places will show an empty box.'
                        : 'The image will be removed from this project.', children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleting(null), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: () => {
                                    const id = deleting.id;
                                    updateLibrary((l) => void delete l.assets[id]);
                                    setDeleting(null);
                                }, children: "Delete" })] }) }) })] }));
}
