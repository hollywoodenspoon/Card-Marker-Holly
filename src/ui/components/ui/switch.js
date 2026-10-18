import { jsx as _jsx } from "react/jsx-runtime";
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
export function Switch({ className, ...props }) {
    return (_jsx(SwitchPrimitive.Root, { className: cn('relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-input transition-colors data-[state=checked]:bg-accent disabled:opacity-40', className), ...props, children: _jsx(SwitchPrimitive.Thumb, { className: "block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" }) }));
}
