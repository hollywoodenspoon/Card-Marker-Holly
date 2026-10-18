import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Crop, ImageUp, RotateCcw } from 'lucide-react';
import { assetResolver } from '@/assets/assetResolver';
import { IMAGE_ACCEPT } from '@/assets/imageAssets';
import { setView, useEditor } from '@/core/editor/editorStore';
import { updateElement } from '@/core/editor/elementCommands';
import { croppedImageDpi, dpiFromMmPerPx, framePlacement, LOW_DPI } from '@/core/render/imageMath';
import { setImageFieldValue, resetFieldValue } from '@/templates/fieldCommands';
import { useImageValue } from '@/ui/panels/properties/useFieldValues';
import { pickFiles, replaceImage } from '@/ui/actions/imageActions';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/input';
import { Slider } from '@/ui/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { Row, Section } from '@/ui/components/fields';
function DpiNote({ dpi }) {
    if (dpi === undefined)
        return null;
    const low = dpi < LOW_DPI;
    return (_jsxs("p", { className: low ? 'flex items-start gap-1.5 text-xs text-warning' : 'text-xs text-muted-foreground', children: [low && _jsx(AlertTriangle, { className: "mt-px size-3.5 shrink-0" }), low
                ? `Prints at about ${Math.round(dpi)} DPI. Use a larger image (300 DPI or more) for sharp print.`
                : `Prints at about ${Math.round(dpi)} DPI.`] }));
}
export function ImageSection({ el, editable }) {
    const cropId = useEditor((s) => s.view.cropId);
    const info = useEditor((s) => s.library.assets[el.assetId]);
    const dpi = info && !info.isVector
        ? croppedImageDpi(el.wMm, el.hMm, info.widthPx, info.heightPx, el.crop)
        : undefined;
    const cropping = cropId === el.id;
    return (_jsxs(Section, { title: "Image", children: [!info && (_jsx("p", { className: "text-xs text-danger", children: "The image file is missing. Replace it to fix." })), _jsxs(Row, { children: [_jsxs(Button, { variant: cropping ? 'default' : 'outline', size: "sm", disabled: !editable || !info, onClick: () => setView({ cropId: cropping ? null : el.id }), children: [_jsx(Crop, {}), " ", cropping ? 'Done' : 'Crop'] }), _jsxs(Button, { variant: "outline", size: "sm", disabled: !editable, onClick: async () => {
                            const [f] = await pickFiles(IMAGE_ACCEPT, false);
                            if (f)
                                await replaceImage(el.id, f);
                        }, children: [_jsx(ImageUp, {}), " Replace"] })] }), cropping && (_jsx("p", { className: "text-xs text-muted-foreground", children: "Drag the picture to move it. Drag the handles to change what is shown." })), el.crop && !cropping && (_jsxs(Button, { variant: "ghost", size: "sm", disabled: !editable, onClick: () => updateElement(el.id, (e) => void (e.type === 'image' && delete e.crop)), children: [_jsx(RotateCcw, {}), " Reset crop"] })), _jsx(DpiNote, { dpi: dpi }), info?.isVector && (_jsx("p", { className: "text-xs text-muted-foreground", children: "SVG \u2014 stays sharp at any size." }))] }));
}
export function ImageFieldSection({ el }) {
    const value = useImageValue(el.id);
    const cropId = useEditor((s) => s.view.cropId);
    const mode = useEditor((s) => s.view.mode);
    const info = useEditor((s) => (value?.assetId ? s.library.assets[value.assetId] : undefined));
    if (!value)
        return null;
    const p = info ? framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, value) : undefined;
    const dpi = info && !info.isVector && p ? dpiFromMmPerPx(p.mmPerPx) : undefined;
    const cropping = cropId === el.id;
    const perCard = mode === 'card';
    const set = (patch, key) => setImageFieldValue(el.id, patch, key ? `${key}:${el.id}` : undefined);
    return (_jsxs(Section, { title: perCard ? 'Art for this card' : 'Default art', children: [info && (_jsx("img", { src: assetResolver.getUrl(info.id), alt: "", className: "h-24 w-full rounded-md border bg-muted object-contain" })), _jsxs(Row, { children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: async () => {
                            const [f] = await pickFiles(IMAGE_ACCEPT, false);
                            if (f)
                                await replaceImage(el.id, f);
                        }, children: [_jsx(ImageUp, {}), " ", info ? 'Replace' : 'Choose image'] }), _jsxs(Button, { variant: cropping ? 'default' : 'outline', size: "sm", disabled: !info || !perCard, title: !perCard ? 'Framing is set per card' : undefined, onClick: () => setView({ cropId: cropping ? null : el.id }), children: [_jsx(Crop, {}), " ", cropping ? 'Done' : 'Reposition'] })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Tip: select this frame, then tap an image in Assets \u2014 or drop one on it." }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { children: "Fit" }), _jsx(Tabs, { value: value.fit ?? el.fit, onValueChange: (v) => set({ fit: v }), children: _jsxs(TabsList, { className: "w-full", children: [_jsx(TabsTrigger, { value: "fill", children: "Fill frame" }), _jsx(TabsTrigger, { value: "fit", children: "Fit inside" })] }) })] }), perCard && info && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs(Label, { children: ["Zoom \u00B7 ", Math.round(value.zoom * 100), "%"] }), _jsx(Slider, { "aria-label": "Zoom image", min: 100, max: 400, step: 1, value: [Math.round(value.zoom * 100)], onValueChange: ([v]) => set({ zoom: v / 100 }, 'zoom') })] })), perCard && (value.offsetXMm || value.offsetYMm || value.zoom !== 1) ? (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => set({ offsetXMm: 0, offsetYMm: 0, zoom: 1 }), children: [_jsx(RotateCcw, {}), " Reset framing"] })) : null, perCard && value.assetId && value.assetId !== el.defaultAssetId && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => resetFieldValue(el.id), children: "Use template default" })), _jsx(DpiNote, { dpi: dpi })] }));
}
