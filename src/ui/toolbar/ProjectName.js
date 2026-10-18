import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { commit, useEditor } from '@/core/editor/editorStore';
import { cn } from '@/lib/cn';
/** Click-to-rename project title. */
export function ProjectName({ className }) {
    const name = useEditor((s) => s.doc?.project.name ?? '');
    // null while not editing, so the field always shows the stored name.
    const [editing, setDraft] = useState(null);
    const draft = editing ?? name;
    const save = () => {
        const v = draft.trim();
        if (v && v !== name)
            commit((d) => void (d.project.name = v));
        setDraft(null);
    };
    return (_jsx("input", { "aria-label": "Project name", value: draft, onChange: (e) => setDraft(e.target.value), onBlur: save, onKeyDown: (e) => {
            if (e.key === 'Enter')
                e.currentTarget.blur();
            if (e.key === 'Escape') {
                setDraft(null);
                e.currentTarget.blur();
            }
        }, className: cn('h-9 min-w-0 rounded-md bg-transparent px-2 text-sm font-semibold outline-none hover:bg-muted focus:bg-muted', className), style: { width: `${Math.max(6, Math.min(28, draft.length + 2))}ch` } }));
}
