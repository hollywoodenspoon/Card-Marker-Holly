import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSaveStatus } from '@/storage/saveStatus';
export function SaveIndicator({ compact }) {
    const { status, error } = useSaveStatus();
    const label = status === 'saved' ? 'Saved' : status === 'error' ? 'Not saved' : 'Saving…';
    return (_jsxs("span", { role: "status", "aria-live": "polite", title: status === 'error' ? `Saving failed: ${error}` : label, className: cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground', status === 'error' && 'bg-danger/10 text-danger'), children: [status === 'saved' && _jsx(Check, { className: "size-3.5" }), (status === 'saving' || status === 'pending') && (_jsx(Loader2, { className: "size-3.5 animate-spin" })), status === 'error' && _jsx(AlertCircle, { className: "size-3.5" }), _jsx("span", { className: cn(compact && 'sr-only'), children: label })] }));
}
