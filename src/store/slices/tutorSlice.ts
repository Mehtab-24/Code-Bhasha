import { StateCreator } from 'zustand';
import type { TutorSlice, RootState, TutorMessage } from '../types';

export const createTutorSlice: StateCreator<RootState, [], [], TutorSlice> = (set, get) => ({
  tutorMessages: [
    {
      id: 'init_msg',
      sender: 'tutor',
      text: 'Bhai, welcome to CodeBhasha! Main hoon tera Socratic Hinglish Tutor. Main tere doubts clear karunga bina solution directly bataye. Kya help chahiye?',
      timestamp: Date.now()
    }
  ],
  isFetchingTutor: false,
  isTutorOpen: false,

  sendTutorMessage: async (text: string) => {
    const userMessageId = `msg_${Date.now()}_user`;
    const tutorMessageId = `msg_${Date.now()}_tutor`;

    const userMessage: TutorMessage = {
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    const initialTutorMessage: TutorMessage = {
      id: tutorMessageId,
      sender: 'tutor',
      text: '',
      timestamp: Date.now() + 50
    };

    // Append user message and pre-load empty tutor bubble
    set((state) => ({
      tutorMessages: [...state.tutorMessages, userMessage, initialTutorMessage],
      isFetchingTutor: true
    }));

    // Gather active workspace context
    const state = get();
    const activeFile = state.getActiveFile();
    const activeCode = activeFile ? activeFile.content : '';
    const consoleOutput = state.output.map((o) => o.text).join('\n');
    const activeError = state.error;

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: get().tutorMessages.slice(0, -1).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          context: {
            code: activeCode,
            console: consoleOutput,
            error: activeError ? `${activeError.type}: ${activeError.message}` : null
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Socratic help');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.field === 'error') {
                throw new Error(parsed.text);
              }

              if (parsed.field === 'text') {
                set((state) => ({
                  tutorMessages: state.tutorMessages.map((m) =>
                    m.id === tutorMessageId ? { ...m, text: m.text + parsed.text } : m
                  )
                }));
              }
            } catch (jsonErr) {
              console.warn('Failed to parse tutor stream line:', jsonErr);
            }
          }
        }
      }

      set({ isFetchingTutor: false });
    } catch (err) {
      console.error('[TutorSlice] Failed to send tutor message:', err);
      set((state) => ({
        tutorMessages: state.tutorMessages.map((m) =>
          m.id === tutorMessageId 
            ? { ...m, text: 'Bhai, lagta hai internet connection me issue hai. Dobara try karo.' } 
            : m
        ),
        isFetchingTutor: false
      }));
    }
  },

  clearTutorHistory: () => {
    set({
      tutorMessages: [
        {
          id: 'init_msg',
          sender: 'tutor',
          text: 'Bhai, welcome to CodeBhasha! Main hoon tera Socratic Hinglish Tutor. Main tere doubts clear karunga bina solution directly bataye. Kya help chahiye?',
          timestamp: Date.now()
        }
      ]
    });
  },

  setTutorOpen: (open: boolean) => {
    set({ isTutorOpen: open });
  }
});
export default createTutorSlice;
