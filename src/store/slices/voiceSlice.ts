import { StateCreator } from 'zustand';
import type { VoiceSlice, RootState, VoiceResult } from '../types';
import { sha256 } from '@/lib/crypto';
import { idbCache } from '@/lib/idb-cache';

const voiceInflightRequests = new Map<string, Promise<VoiceResult>>();

export const createVoiceSlice: StateCreator<RootState, [], [], VoiceSlice> = (set) => ({
  isRecording: false,
  transcript: '',
  isGeneratingCode: false,
  voiceResult: null,

  setIsRecording: (recording: boolean) => {
    set({ isRecording: recording });
  },

  setTranscript: (transcript: string) => {
    set({ transcript });
  },

  resetVoiceState: () => {
    set({
      isRecording: false,
      isGeneratingCode: false,
      voiceResult: null,
    });
  },

  generateCodeFromVoice: async (transcript: string) => {
    // Generate request cache key hash
    const hash = await sha256(transcript);

    // 1. Check local IndexedDB cache first (zero latency)
    const cached = await idbCache.get<VoiceResult>(hash);
    if (cached) {
      console.log('[Cache] Hit for voice generator:', hash);
      set({
        isGeneratingCode: false,
        voiceResult: cached
      });
      return cached;
    }

    // 2. Check if there is an in-flight request for the same transcript
    if (voiceInflightRequests.has(hash)) {
      console.log('[Deduplication] Joining active request:', hash);
      set({ isGeneratingCode: true });
      try {
        const result = await voiceInflightRequests.get(hash)!;
        set({
          isGeneratingCode: false,
          voiceResult: result || null
        });
        return result;
      } catch (err) {
        set({ isGeneratingCode: false });
        throw err;
      }
    }

    set({ 
      isGeneratingCode: true, 
      voiceResult: {
        transcript,
        code: '',
        explanation: ''
      } 
    });
    
    // Create the fetch promise
    const fetchPromise = (async () => {
      const response = await fetch('/api/voice-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });

      if (!response.ok) {
        throw new Error('Voice-to-code failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let finalResult = {
        transcript,
        code: '',
        explanation: ''
      };

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.field === 'error') {
                throw new Error(parsed.text);
              }
              
              set((state) => {
                const prev = state.voiceResult || { transcript, code: '', explanation: '' };
                
                let code = prev.code;
                let explanation = prev.explanation;
                let files = state.files;
                
                if (parsed.field === 'code') {
                  code += parsed.text;
                  if (state.activeFileId) {
                    files = state.files.map((f) =>
                      f.id === state.activeFileId ? { ...f, content: code } : f
                    );
                  }
                } else if (parsed.field === 'explanation') {
                  explanation += parsed.text;
                }
                
                finalResult = {
                  transcript: prev.transcript,
                  code,
                  explanation
                };

                return {
                  voiceResult: finalResult,
                  files
                };
              });
            } catch (jsonErr) {
              console.warn("Failed to parse stream line:", jsonErr);
            }
          }
        }
      }

      // Write complete result to cache
      await idbCache.set(hash, finalResult);
      return finalResult;
    })();

    // Store in-flight promise
    voiceInflightRequests.set(hash, fetchPromise);

    try {
      const result = await fetchPromise;
      set({ isGeneratingCode: false });
      return result;
    } catch (err) {
      console.error('Failed to generate code from voice:', err);
      set({ isGeneratingCode: false });
      throw err;
    } finally {
      // Clean up in-flight mapping
      voiceInflightRequests.delete(hash);
    }
  },

  generateCodeFromAudio: async (audioBlob: Blob) => {
    set({ isGeneratingCode: true, voiceResult: null });
    
    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/voice-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Audio,
          mimeType: audioBlob.type 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Voice-to-code failed');
      }

      const result = await response.json();
      set({ 
        voiceResult: result,
        transcript: result.transcript,
        isGeneratingCode: false 
      });
      
      return result;
    } catch (err) {
      console.error('Failed to generate code from audio:', err);
      set({ isGeneratingCode: false });
      throw err;
    }
  }
});
