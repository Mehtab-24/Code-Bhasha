'use client';

import { create } from 'zustand';
import type { RootState } from './types';
import { createFileSlice } from './slices/fileSlice';
import { createStdinSlice } from './slices/stdinSlice';
import { createRunSlice } from './slices/runSlice';
import { createVoiceSlice } from './slices/voiceSlice';
import { createAuthSlice } from './slices/authSlice';
import { createTutorSlice } from './slices/tutorSlice';

// Re-export types so we don't break existing component imports
export type { OutputLine, ExecutionError, DebugResult, VoiceResult, CodeFile } from './types';

export const useExecutionStore = create<RootState>()((set, get, store) => ({
  ...createFileSlice(set, get, store),
  ...createStdinSlice(set, get, store),
  ...createRunSlice(set, get, store),
  ...createVoiceSlice(set, get, store),
  ...createAuthSlice(set, get, store),
  ...createTutorSlice(set, get, store),
}));