import { useEffect, useReducer } from 'react';
import { assetResolver } from '@/assets/assetResolver';
import { onFontsChanged } from '@/assets/fonts';
import { useEditor } from '@/core/editor/editorStore';
/** A counter that changes whenever images finish decoding or fonts load. */
export function useRenderVersion() {
    const [v, bump] = useReducer((x) => x + 1, 0);
    const assets = useEditor((s) => s.library.assets);
    useEffect(() => {
        assetResolver.setAssets(assets);
        bump();
    }, [assets]);
    useEffect(() => {
        const a = assetResolver.subscribe(bump);
        const f = onFontsChanged(bump);
        return () => {
            a();
            f();
        };
    }, []);
    return v;
}
