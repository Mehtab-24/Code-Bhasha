import { StateCreator } from 'zustand';
import type { StdinSlice, RootState } from '../types';

export const createStdinSlice: StateCreator<RootState, [], [], StdinSlice> = (set) => ({
  stdinContent: '',
  setStdinContent: (content: string) => {
    set({ stdinContent: content });
  }
});
