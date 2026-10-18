import { createContext, useContext } from 'react';
export const StageCtx = createContext(null);
export function useStageCtx() {
    const c = useContext(StageCtx);
    if (!c)
        throw new Error('StageCtx missing');
    return c;
}
