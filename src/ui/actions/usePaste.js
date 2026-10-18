import { useEffect } from 'react';
import { importAndPlace } from './imageActions';
/** Paste images from the clipboard onto the card. */
export function usePasteImages() {
    useEffect(() => {
        const onPaste = (e) => {
            const t = e.target;
            if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA'].includes(t.tagName)))
                return;
            const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
            if (!files.length)
                return;
            e.preventDefault();
            void importAndPlace(files);
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, []);
}
