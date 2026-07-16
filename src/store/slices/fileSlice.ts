import { StateCreator } from 'zustand';
import type { FileSlice, RootState } from '../types';
import { localDB } from '@/lib/local-db';

let autosaveTimeout: NodeJS.Timeout | null = null;
let checkpointTimeout: NodeJS.Timeout | null = null;

export const createFileSlice: StateCreator<RootState, [], [], FileSlice> = (set, get) => ({
  files: [
    {
      id: 'file_1',
      name: 'main.py',
      content: '# Yahan apna Python code likho\nprint("Hello CodeBhasha!")'
    }
  ],
  activeFileId: 'file_1',
  checkpoints: [],
  isSaving: false,

  createFile: (name?: string) => {
    const newId = `file_${Date.now()}`;
    const fileName = name || `untitled_${get().files.length + 1}.py`;
    
    const updatedFiles = [
      ...get().files,
      {
        id: newId,
        name: fileName.endsWith('.py') ? fileName : `${fileName}.py`,
        content: '# New Python file\n'
      }
    ];

    set({
      files: updatedFiles,
      activeFileId: newId
    });
    
    // Save state instantly
    localDB.saveFiles(updatedFiles);
    
    return newId;
  },

  deleteFile: (id: string) => {
    const state = get();
    
    // Don't delete if it's the only file
    if (state.files.length === 1) return;
    
    const fileIndex = state.files.findIndex(f => f.id === id);
    if (fileIndex === -1) return;
    
    const newFiles = state.files.filter(f => f.id !== id);
    
    // If deleting active file, switch to another file
    let newActiveId = state.activeFileId;
    if (id === state.activeFileId) {
      const newIndex = fileIndex > 0 ? fileIndex - 1 : 0;
      newActiveId = newFiles[newIndex].id;
    }
    
    set({
      files: newFiles,
      activeFileId: newActiveId
    });

    // Save state instantly
    localDB.saveFiles(newFiles);
  },

  renameFile: (id: string, newName: string) => {
    const fileName = newName.endsWith('.py') ? newName : `${newName}.py`;
    
    const updatedFiles = get().files.map(f =>
      f.id === id ? { ...f, name: fileName } : f
    );

    set({
      files: updatedFiles
    });

    // Save state instantly
    localDB.saveFiles(updatedFiles);
  },

  setActiveFile: (id: string) => {
    set({ activeFileId: id });
    get().loadCheckpoints(id);
  },

  updateFileContent: (id: string, content: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, content } : f
      )
    }));

    // Trigger debounced autosave (3 seconds after typing ceases)
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    set({ isSaving: true });
    
    autosaveTimeout = setTimeout(async () => {
      await localDB.saveFiles(get().files);
      set({ isSaving: false });
    }, 3000);

    // Trigger debounced checkpoint (10 seconds after typing ceases)
    if (checkpointTimeout) clearTimeout(checkpointTimeout);
    checkpointTimeout = setTimeout(async () => {
      await localDB.createCheckpoint(id, content);
      if (get().activeFileId === id) {
        get().loadCheckpoints(id);
      }
    }, 10000);
  },

  getActiveFile: () => {
    const state = get();
    return state.files.find(f => f.id === state.activeFileId);
  },

  loadFilesFromLocalDB: async () => {
    try {
      const files = await localDB.getFiles();
      if (files.length > 0) {
        set({
          files,
          activeFileId: files[0].id
        });
        get().loadCheckpoints(files[0].id);
      } else {
        // Initial setup: persist default files array
        const defaultFiles = get().files;
        await localDB.saveFiles(defaultFiles);
        get().loadCheckpoints(defaultFiles[0].id);
      }
    } catch (err) {
      console.error('[FileSlice] Failed to load local projects:', err);
    }
  },

  loadCheckpoints: async (fileId: string) => {
    try {
      const checkpoints = await localDB.getCheckpoints(fileId);
      set({ checkpoints });
    } catch (err) {
      console.error('[FileSlice] Failed to load checkpoints:', err);
    }
  },

  createCheckpoint: async (fileId: string, content: string) => {
    try {
      await localDB.createCheckpoint(fileId, content);
      if (get().activeFileId === fileId) {
        await get().loadCheckpoints(fileId);
      }
    } catch (err) {
      console.error('[FileSlice] Failed to create checkpoint:', err);
    }
  },

  restoreCheckpoint: (fileId: string, content: string) => {
    // Write new content to editor
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, content } : f
      )
    }));

    // Trigger manual save
    localDB.saveFiles(get().files);
    
    // Create new checkpoint indicating restoration point
    get().createCheckpoint(fileId, content);
  }
});
