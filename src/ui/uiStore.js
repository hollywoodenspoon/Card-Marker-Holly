import { create } from 'zustand';
export const useUi = create((set) => ({
    leftTab: 'cards',
    leftOpen: false,
    rightOpen: false,
    phoneSheet: null,
    setLeftTab: (leftTab) => set({ leftTab }),
    setLeftOpen: (leftOpen) => set({ leftOpen }),
    setRightOpen: (rightOpen) => set({ rightOpen }),
    setPhoneSheet: (phoneSheet) => set({ phoneSheet }),
}));
