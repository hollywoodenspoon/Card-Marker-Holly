import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
export function Slider({ className, ...props }) {
    return (_jsxs(SliderPrimitive.Root, { className: cn('relative flex h-11 w-full touch-none select-none items-center md:h-6', className), ...props, children: [_jsx(SliderPrimitive.Track, { className: "relative h-1.5 grow overflow-hidden rounded-full bg-input", children: _jsx(SliderPrimitive.Range, { className: "absolute h-full bg-accent" }) }), _jsx(SliderPrimitive.Thumb, { "aria-label": props['aria-label'], className: "block size-5 rounded-full border-2 border-accent bg-panel shadow md:size-4" })] }));
}
