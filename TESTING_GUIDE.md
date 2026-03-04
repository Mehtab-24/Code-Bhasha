# Testing Guide - Frontend Fixes

## Quick Test Procedure

### 1. Test Worker Initialization (Bug 1 Fix)

**Steps:**
1. Stop your dev server if running: `Ctrl+C`
2. Clear browser cache and close all tabs
3. Start dev server: `npm run dev`
4. Open `http://localhost:3000` in a new tab
5. Watch the "▶ Chalao" button

**Expected Results:**
- ✅ Button should show "Initializing..." briefly
- ✅ Within 5-10 seconds, should change to "▶ Chalao"
- ✅ If it takes longer, should still change within 30 seconds max
- ✅ Check browser console - should see: `[Worker] Pyodide initialized successfully`

**If it fails:**
- Check browser console for errors
- Look for: `[ExecutionService] Worker is ready`
- After 30 seconds, should see: `[AppShell] Worker initialization timeout - assuming ready anyway`

---

### 2. Test Microphone Permission (Bug 2 Fix)

**Test A: Deny Permission**
1. Click "🎤 Bolo" tab
2. Click the microphone button
3. When browser asks for permission, click "Block" or "Deny"
4. Should see error: "Mic ki permission chahiye. Settings mein jaake allow karo, aur page refresh karo."
5. Error should be in red with an alert icon

**Test B: Grant Permission After Denial**
1. Go to browser settings (usually click the lock icon in address bar)
2. Change microphone permission to "Allow"
3. Refresh the page (`F5` or `Cmd+R`)
4. Click "🎤 Bolo" tab again
5. Click microphone button
6. Should now start recording (waveform animates, button glows)

**Test C: No Microphone Connected**
1. Disconnect or disable your microphone
2. Click microphone button
3. Should see: "Microphone nahi mila. Check karo ki mic connected hai."

---

### 3. Test Smooth Scrolling (Bug 3 Fix)

**Steps:**
1. Make sure the page has enough content to scroll
2. Use mouse wheel to scroll up and down
3. Try scrolling fast and slow
4. Try on mobile (if available) with touch gestures

**Expected Results:**
- ✅ Scrolling should be smooth and fluid
- ✅ No stuttering or jarring
- ✅ No "jumpy" behavior
- ✅ Scroll should feel natural like any modern website

**Compare Before/After:**
- Before: Scroll felt "stuck" or "stuttery"
- After: Scroll is smooth and responsive

---

## Full Integration Test

### Complete User Flow Test

1. **Open App**
   - Page loads smoothly
   - No infinite loading states

2. **Write Code**
   - Click "✏ Likho" tab
   - Type some Python code:
     ```python
     print("Hello CodeBhasha!")
     for i in range(5):
         print(f"Number {i}")
     ```

3. **Run Code**
   - Click "▶ Chalao" button
   - Should see output in the Output panel
   - Output should appear line by line

4. **Test Voice Feature**
   - Click "🎤 Bolo" tab
   - Click microphone button
   - Grant permission if asked
   - Click stop (or let it auto-stop)
   - Type in transcript box: "Ek loop banao 1 se 10 tak"
   - Click "✨ Code Banao"
   - Generated code should appear in editor

5. **Test Error Handling**
   - Write bad Python code:
     ```python
     print("missing closing quote
     ```
   - Click "▶ Chalao"
   - Should see error in Debugger tab
   - Should get Hinglish explanation from Desi Debugger

6. **Test Scrolling**
   - Scroll up and down the page
   - Should be smooth throughout

---

## Browser-Specific Tests

### Chrome/Edge
- All features should work perfectly
- MediaRecorder uses `audio/webm;codecs=opus`

### Firefox
- All features should work
- May use different audio codec

### Safari (Desktop)
- All features should work
- May need different audio format

### Mobile Safari (iOS)
- Scrolling should be especially smooth
- Touch gestures should work well
- Microphone permission flow may differ

---

## Performance Checks

### Check Console Logs

**Good Signs:**
```
[Worker] Loading Pyodide...
[Worker] Pyodide initialized successfully
[ExecutionService] Worker is ready
```

**Warning Signs (but OK):**
```
[AppShell] Worker initialization timeout - assuming ready anyway
[ExecutionService] Setting worker ready despite initialization error
```

**Bad Signs (needs investigation):**
```
[ExecutionService] Failed to initialize worker: [error details]
[Worker] Failed to initialize Pyodide: [error details]
```

### Check Network Tab

1. Open DevTools → Network tab
2. Refresh page
3. Look for:
   - ✅ `pyodide.js` - should load from CDN
   - ✅ `pyodide.asm.js` - large file (~10MB)
   - ✅ Should complete within 10-15 seconds on good connection

---

## Common Issues & Solutions

### Issue: "Initializing..." never goes away
**Solution**: 
- Wait 30 seconds - should auto-resolve
- Check browser console for errors
- Try hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`

### Issue: Microphone error persists
**Solution**:
- Check browser settings for microphone permission
- Refresh page after granting permission
- Try in incognito/private window

### Issue: Scrolling still stutters
**Solution**:
- Hard refresh to clear cached CSS
- Check if browser extensions are interfering
- Try in incognito mode

### Issue: Code doesn't run
**Solution**:
- Wait for "▶ Chalao" button to be enabled
- Check browser console for worker errors
- Try refreshing the page

---

## Automated Testing (Future)

For CI/CD, consider adding:
- Playwright tests for UI interactions
- Jest tests for state management
- Lighthouse for performance metrics
- Accessibility audits

---

## Success Criteria

All tests pass if:
- ✅ No infinite loading states
- ✅ Microphone errors clear on retry
- ✅ Scrolling is smooth and natural
- ✅ Code execution works reliably
- ✅ Voice-to-code flow completes
- ✅ Error messages are clear and helpful

---

## Report Issues

If you find any remaining issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Note your browser and OS version
4. Take screenshots if helpful
5. Document expected vs actual behavior

---

**Happy Testing! 🎉**
