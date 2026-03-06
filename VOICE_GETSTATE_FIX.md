# Voice-to-Code getState() Fix

## Problem
The VoicePanel was using `useRef` and `useEffect` to maintain a reference to the code injection function. This created a stale closure problem where the `recognition.onend` handler and `handleGenerateCode` function would capture old values of `activeFileId` and `updateFileContent`, causing generated code to not inject into the active file.

## Root Cause
React hooks create closures that capture values at the time the function is defined. When the Speech Recognition API's `onend` handler was set up during component mount, it captured the initial state values. Even though we tried to work around this with `useRef`, the closure problem persisted because the async handlers were still referencing stale state.

## Solution
Replaced the `useRef` hack with Zustand's direct `.getState()` method, which always returns the current state without any closure issues.

## Changes Made

### 1. Removed useRef and useEffect hack
**Before:**
```typescript
const injectCodeRef = useRef<((code: string) => void) | null>(null);

const injectGeneratedCode = useCallback((code: string) => {
  if (activeFileId) {
    updateFileContent(activeFileId, code);
  }
  if (onCodeGenerated) {
    onCodeGenerated(code);
  }
}, [activeFileId, updateFileContent, onCodeGenerated]);

useEffect(() => {
  injectCodeRef.current = injectGeneratedCode;
}, [injectGeneratedCode]);
```

**After:**
```typescript
// Removed entirely - no longer needed
```

### 2. Updated recognition.onend handler
**Before:**
```typescript
if (result && result.code) {
  if (injectCodeRef.current) {
    injectCodeRef.current(result.code);
  }
}
```

**After:**
```typescript
if (result && result.code) {
  // FIX: Use getState() to get fresh state directly
  const store = useExecutionStore.getState();
  if (store.activeFileId) {
    store.updateFileContent(store.activeFileId, result.code);
  }
  
  // Also call callback if provided (for backward compatibility)
  if (onCodeGenerated) {
    onCodeGenerated(result.code);
  }
}
```

### 3. Updated handleGenerateCode function
**Before:**
```typescript
if (result && 'code' in result && result.code) {
  injectGeneratedCode(result.code);
}
```

**After:**
```typescript
if (result && 'code' in result && result.code) {
  // FIX: Use getState() to get fresh state directly
  const store = useExecutionStore.getState();
  if (store.activeFileId) {
    store.updateFileContent(store.activeFileId, result.code);
  }
  
  // Also call callback if provided (for backward compatibility)
  if (onCodeGenerated) {
    onCodeGenerated(result.code);
  }
}
```

### 4. Cleaned up store destructuring
**Before:**
```typescript
const {
  isRecording,
  transcript,
  isGeneratingCode,
  voiceResult,
  setIsRecording,
  setTranscript,
  generateCodeFromVoice,
  resetVoiceState,
  activeFileId,        // ← No longer needed
  updateFileContent,   // ← No longer needed
} = useExecutionStore();
```

**After:**
```typescript
const {
  isRecording,
  transcript,
  isGeneratingCode,
  voiceResult,
  setIsRecording,
  setTranscript,
  generateCodeFromVoice,
  resetVoiceState,
} = useExecutionStore();
```

## How getState() Works
Zustand's `.getState()` method returns the current state directly from the store without creating a subscription or closure. This means:

1. **Always Fresh**: Every call to `useExecutionStore.getState()` returns the latest state
2. **No Closures**: No risk of capturing stale values in async handlers
3. **Direct Access**: Can be called from anywhere, including event handlers and async functions
4. **No Re-renders**: Doesn't cause component re-renders since it's not a hook

## Testing
To verify the fix works:

1. Create multiple files in the editor (e.g., `main.py`, `utils.py`, `test.py`)
2. Switch to a specific file (e.g., `utils.py`)
3. Use voice input: "List ko reverse karne ka function banao"
4. Click "Code Banao" button
5. **Expected**: Code should inject into the active file (`utils.py`)
6. **Before Fix**: Code would inject into the first file or not at all

## Benefits
- ✅ No more stale closures
- ✅ Simpler code (removed useRef, useEffect, and wrapper function)
- ✅ More reliable multi-file support
- ✅ Works for both voice recording and manual "Code Banao" button
- ✅ Maintains backward compatibility with `onCodeGenerated` callback

## Files Modified
- `src/components/Voice/VoicePanel.tsx`

## Related Issues
This fix resolves the issue where voice-generated code would not inject into the active file when using the multi-file tabbed editor feature.
