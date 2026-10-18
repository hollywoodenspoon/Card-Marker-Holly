import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, title, description, ...props }) {
    return (_jsxs(DialogPrimitive.Portal, { children: [_jsx(DialogPrimitive.Overlay, { className: "fixed inset-0 z-50 bg-black/40" }), _jsxs(DialogPrimitive.Content, { className: cn('fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-xl border bg-panel p-5 shadow-xl', className), ...props, children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(DialogPrimitive.Title, { className: "text-base font-semibold", children: title }), _jsx(DialogPrimitive.Description, { className: cn('text-sm text-muted-foreground', !description && 'sr-only'), children: description ?? title })] }), _jsx(DialogPrimitive.Close, { "aria-label": "Close", className: "-m-2 grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted md:size-8", children: _jsx(X, { className: "size-4" }) })] }), children] })] }));
}
