import { create } from 'zustand';
export const useSaveStatus = create(() => ({
    status: 'saved',
}));
