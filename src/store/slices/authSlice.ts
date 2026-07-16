import { StateCreator } from 'zustand';
import type { AuthSlice, RootState } from '../types';

export const createAuthSlice: StateCreator<RootState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  authStatus: 'unauthenticated',
  isSyncing: false,
  lastSyncedAt: null,

  signIn: async (username: string, email: string) => {
    set({ authStatus: 'loading' });
    
    // Simulate minor network delay for natural UI response transitions
    await new Promise((r) => setTimeout(r, 600));

    const userProfile = {
      username,
      email,
      isGuest: false
    };

    set({ 
      user: userProfile,
      authStatus: 'authenticated'
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('codebhasha-user', JSON.stringify(userProfile));
    }

    // Pull user projects from the cloud
    try {
      const response = await fetch(`/api/projects?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.projects && data.projects.length > 0) {
          // Merge remote projects into Zustand workspace
          set({
            files: data.projects,
            activeFileId: data.projects[0].id
          });
          
          // Cache remotely fetched projects in IndexedDB
          const { localDB } = await import('@/lib/local-db');
          await localDB.saveFiles(data.projects);
          await get().loadCheckpoints(data.projects[0].id);
        } else {
          // If cloud profile has no files, push current local workspace files to cloud
          await get().syncProjectsToCloud();
        }
      }
    } catch (err) {
      console.error('[AuthSlice] Failed to sync projects on login:', err);
    }
  },

  signOut: async () => {
    set({ authStatus: 'loading' });
    await new Promise((r) => setTimeout(r, 400));

    if (typeof window !== 'undefined') {
      localStorage.removeItem('codebhasha-user');
    }

    set({
      user: null,
      authStatus: 'unauthenticated',
      lastSyncedAt: null
    });

    // Reset editor workspace to default guest configuration
    const defaultFiles = [
      {
        id: 'file_1',
        name: 'main.py',
        content: '# Yahan apna Python code likho\nprint("Hello CodeBhasha!")'
      }
    ];

    set({
      files: defaultFiles,
      activeFileId: 'file_1',
      checkpoints: []
    });

    const { localDB } = await import('@/lib/local-db');
    await localDB.saveFiles(defaultFiles);
    await get().loadCheckpoints('file_1');
  },

  syncProjectsToCloud: async () => {
    const user = get().user;
    if (!user) return;

    set({ isSyncing: true });
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          files: get().files
        })
      });

      if (response.ok) {
        set({ lastSyncedAt: Date.now() });
      }
    } catch (err) {
      console.error('[AuthSlice] Failed to cloud sync projects:', err);
    } finally {
      set({ isSyncing: false });
    }
  },

  setAuthStatus: (status) => set({ authStatus: status })
});
export default createAuthSlice;
