import { StateCreator } from 'zustand';
import type { VoiceSlice, RootState, VoiceResult } from '../types';
import { sha256 } from '@/lib/crypto';
import { idbCache } from '@/lib/idb-cache';
import { sanitizeGeneratedCode } from '@/lib/sanitize-code';

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
      // Older cache entries may predate the sanitation guard — clean on read.
      const cleanCached: VoiceResult = {
        ...cached,
        code: sanitizeGeneratedCode(cached.code ?? '').code,
      };
      // Same injection contract as the stream path: the sanitized code
      // replaces the active file's content.
      set((state) => ({
        isGeneratingCode: false,
        voiceResult: cleanCached,
        files:
          cleanCached.code.trim() && state.activeFileId
            ? state.files.map((f) =>
                f.id === state.activeFileId ? { ...f, content: cleanCached.code } : f
              )
            : state.files,
      }));
      return cleanCached;
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
        // Surface the server's unmasked Bedrock diagnostic instead of a
        // generic message — the red banner shows the actual root cause.
        let diagnostic = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          const parts = [data?.error, data?.details, data?.code ? `HTTP ${data.code}` : null].filter(Boolean);
          if (parts.length) diagnostic = parts.join(' · ');
        } catch {
          // non-JSON error body — keep the HTTP status line
        }
        throw new Error(diagnostic);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let finalResult = {
        transcript,
        code: '',
        explanation: ''
      };

      // Once the model drifts past its code into verbose prose, every later
      // 'code' chunk is explanation text — stop feeding it to the buffer.
      let codeClosed = false;

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
                  if (codeClosed) {
                    explanation += parsed.text;
                  } else {
                    // Sanitation guard: only pure executable Python reaches
                    // the editor buffer (no markers, fences, or prose).
                    const sanitized = sanitizeGeneratedCode(code + parsed.text);
                    code = sanitized.code;
                    if (sanitized.truncated) {
                      codeClosed = true;
                      explanation += sanitized.remainder;
                    }
                    if (state.activeFileId) {
                      files = state.files.map((f) =>
                        f.id === state.activeFileId ? { ...f, content: code } : f
                      );
                    }
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

      // Write complete result to cache — but never cache an empty response:
      // a transient Bedrock hiccup must not poison future generations.
      if (finalResult.code.trim()) {
        await idbCache.set(hash, finalResult);
      }
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
      const cleanResult: VoiceResult = {
        ...result,
        code: sanitizeGeneratedCode(result.code ?? '').code,
      };
      set({ 
        voiceResult: cleanResult,
        transcript: cleanResult.transcript,
        isGeneratingCode: false 
      });
      
      return cleanResult;
    } catch (err) {
      console.error('Failed to generate code from audio:', err);
      set({ isGeneratingCode: false });
      throw err;
    }
  }
});
