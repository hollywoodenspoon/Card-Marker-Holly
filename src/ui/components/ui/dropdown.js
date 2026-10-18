import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DropdownMenu as DM } from 'radix-ui';
import { cn } from '@/lib/cn';
export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export function DropdownMenuContent({ className, ...props }) {
    return (_jsx(DM.Portal, { children: _jsx(DM.Content, { sideOffset: 6, collisionPadding: 8, className: cn('z-50 min-w-44 rounded-lg border bg-panel p-1 text-sm shadow-lg', className), ...props }) }));
}
export function DropdownMenuItem({ className, danger, ...props }) {
    return (_jsx(DM.Item, { className: cn('flex h-11 cursor-default items-center gap-2 rounded-md px-2.5 outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted md:h-8 [&_svg]:size-4 [&_svg]:text-muted-foreground', danger && 'text-danger [&_svg]:text-danger', className), ...props }));
}
export function DropdownMenuSeparator() {
    return _jsx(DM.Separator, { className: "my-1 h-px bg-border" });
}
export function DropdownMenuLabel({ className, ...props }) {
    return (_jsx(DM.Label, { className: cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className), ...props }));
}
export const DropdownMenuRadioGroup = DM.RadioGroup;
export function DropdownMenuRadioItem({ className, children, ...props }) {
    return (_jsxs(DM.RadioItem, { className: cn('flex h-11 cursor-default items-center gap-2 rounded-md px-2.5 outline-none select-none data-[highlighted]:bg-muted md:h-8 [&_svg]:size-4', className), ...props, children: [_jsx("span", { className: "grid size-4 place-items-center", children: _jsx(DM.ItemIndicator, { children: _jsx("span", { className: "block size-2 rounded-full bg-accent" }) }) }), children] }));
}
