# Desi Debugger Test Examples

## Test Cases for Phase 3 Verification

### 1. SyntaxError - Missing Closing Parenthesis
```python
print("Hello World"
```

**Expected Error:**
- Type: `SyntaxError`
- Message: `unexpected EOF while parsing`
- Line: 1

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Bhai, line 1 pe 'print' ke baad bracket band karna bhool gaye — ')' lagao",
  "fix_suggestion": "Line 1 pe jaake 'print' statement ke end mein ')' add karo",
  "corrected_line": "print(\"Hello World\")"
}
```

---

### 2. IndentationError - Unexpected Indent
```python
print("Hello")
  print("World")
```

**Expected Error:**
- Type: `IndentationError`
- Message: `unexpected indent`
- Line: 2

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Yaar, line 2 pe extra space aa gayi hai. Python mein indentation bahut important hai!",
  "fix_suggestion": "Line 2 ke shuru se extra spaces hata do, seedha left se likho",
  "corrected_line": "print(\"World\")"
}
```

---

### 3. NameError - Undefined Variable
```python
x = 10
print(y)
```

**Expected Error:**
- Type: `NameError`
- Message: `name 'y' is not defined`
- Line: 2

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Bhai, line 2 pe 'y' naam ka koi variable nahi banaya tumne. Pehle define karo, phir use karo!",
  "fix_suggestion": "Line 2 mein 'y' ki jagah 'x' likho, ya phir pehle 'y = kuch_value' define karo",
  "corrected_line": "print(x)"
}
```

---

### 4. TypeError - Wrong Type Operation
```python
x = "10"
y = 5
print(x + y)
```

**Expected Error:**
- Type: `TypeError`
- Message: `can only concatenate str (not "int") to str`
- Line: 3

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Yaar, line 3 pe string aur number ko directly add nahi kar sakte. Dono ko same type mein convert karo!",
  "fix_suggestion": "Ya toh 'int(x) + y' karo (dono number), ya 'x + str(y)' karo (dono string)",
  "corrected_line": "print(int(x) + y)"
}
```

---

### 5. ZeroDivisionError - Division by Zero
```python
x = 10
y = 0
print(x / y)
```

**Expected Error:**
- Type: `ZeroDivisionError`
- Message: `division by zero`
- Line: 3

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Bhai, line 3 pe zero se divide kar rahe ho! Math mein ye allowed nahi hai, computer crash ho jayega!",
  "fix_suggestion": "Pehle check karo ki 'y' zero toh nahi hai: 'if y != 0:' lagao division se pehle",
  "corrected_line": "if y != 0:\n    print(x / y)"
}
```

---

### 6. IndexError - List Index Out of Range
```python
numbers = [1, 2, 3]
print(numbers[5])
```

**Expected Error:**
- Type: `IndexError`
- Message: `list index out of range`
- Line: 2

**Expected Bedrock Response:**
```json
{
  "friendly_message": "Yaar, line 2 pe list mein sirf 3 items hain (0, 1, 2 index), tum 5 pe access kar rahe ho!",
  "fix_suggestion": "Index ko list ki length se kam rakho: 'numbers[0]' ya 'numbers[1]' ya 'numbers[2]' use karo",
  "corrected_line": "print(numbers[2])"
}
```

---

## Testing Instructions

### Setup
1. Ensure `.env.local` has valid AWS credentials
2. Start the development server: `npm run dev`
3. Open http://localhost:3000

### Manual Test Steps
1. Copy one of the error code examples above
2. Paste into the Monaco editor
3. Click "▶ Chalao" button
4. Wait for execution to complete
5. Observe:
   - Error appears in Output tab
   - UI auto-switches to Debugger tab
   - Loading spinner shows "Desi Debugger soch raha hai..."
   - After ~2-4s, Bedrock response appears with:
     - 💬 Friendly message in Hinglish
     - 🔧 Fix suggestion
     - ✨ Corrected code (if available)

### Verification Checklist
- [ ] Error is captured correctly
- [ ] Debugger tab activates automatically
- [ ] Loading state shows during API call
- [ ] Hinglish explanation is friendly and conversational
- [ ] Fix suggestion is actionable and specific
- [ ] Corrected code is syntactically valid
- [ ] UI styling matches premium dark mode design
- [ ] No AWS credentials visible in browser DevTools
- [ ] Network tab shows POST to `/api/debug`
- [ ] Response time is under 5 seconds

### Edge Cases to Test
- [ ] Network failure (disconnect internet)
- [ ] Invalid AWS credentials
- [ ] Very long code (>2000 chars)
- [ ] Multiple rapid errors
- [ ] Code with no errors (should not trigger debugger)

---

## Expected UI Behavior

### Before Error
- Output tab is active
- Debugger tab shows "Koi error nahi mili. Sab theek hai!"

### During Execution
- "Chal raha hai..." button state
- Pulsing green ring around Run button
- EXECUTING indicator in Output tab

### After Error (Automatic Flow)
1. Error captured by Pyodide
2. Raw error shown in Output tab
3. UI auto-switches to Debugger tab
4. Loading spinner appears
5. POST request to `/api/debug`
6. Bedrock processes error
7. Response received
8. Hinglish explanation displayed with animations

### Debugger Tab Layout
```
┌─────────────────────────────────────┐
│ 💡 DESI DEBUGGER                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔴 SyntaxError        line 1    │ │
│ │ unexpected EOF while parsing    │ │
│ │                                 │ │
│ │ problematic line                │ │
│ │ print("Hello World"             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💬 Desi Debugger                │ │
│ │ Bhai, line 1 pe 'print' ke     │ │
│ │ baad bracket band karna bhool   │ │
│ │ gaye — ')' lagao                │ │
│ │                                 │ │
│ │ 🔧 Fix Suggestion               │ │
│ │ Line 1 pe jaake 'print'         │ │
│ │ statement ke end mein ')' add   │ │
│ │ karo                            │ │
│ │                                 │ │
│ │ ✨ Corrected Code               │ │
│ │ print("Hello World")            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 Tip: Agar code mein koi problem │
│ ho toh yahan samjhaya jayega...    │
└─────────────────────────────────────┘
```

---

**Note**: Actual Bedrock responses may vary slightly based on the model's interpretation, but should follow the system prompt guidelines (friendly, conversational, max 3 sentences, starts with "Bhai" or "Yaar").
