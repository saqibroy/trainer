# ✅ React Hooks Error Fixed - Conversation Type Black Screen

## 🎯 Problem Fixed

### Error: "Rendered more hooks than during the previous render"

**Symptom:**
- Black screen when starting practice on conversation exercises
- Console error: `Uncaught Error: Rendered more hooks than during the previous render`
- Error at line 3637 in App.tsx
- App crashes completely

**Root Cause:**
The `React.useState` hook was being called **conditionally** inside the match question type rendering:

```typescript
// ❌ WRONG - Hook inside conditional statement
{currentQuestion.type === 'match' && (() => {
  if (allSame && rightItems.length > 1) {
    const [checkedItems, setCheckedItems] = React.useState<Set<number>>(new Set());
    // ...
  }
})()}
```

**Why this breaks:**
React requires that hooks are called in the **same order** on every render. When you:
1. Start with a match question → React sees useState for `checkedItems`
2. Switch to conversation question → React doesn't see that useState
3. React thinks: "Wait, there's a different number of hooks now!"
4. **Result:** Crash with black screen

---

## ✅ Solution Implemented

### 1. **Moved Hook to Top Level**

Moved the `matchCheckedItems` state from conditional code to the top of the component:

```typescript
// ✅ CORRECT - Hook at top level, always called
const App = () => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [conversationTurnIndex, setConversationTurnIndex] = useState(0);
  const [conversationAnswers, setConversationAnswers] = useState<string[]>([]);
  const [matchCheckedItems, setMatchCheckedItems] = useState<Set<number>>(new Set()); // NEW!
  // ... other state
```

### 2. **Updated References**

Changed all references from `checkedItems` → `matchCheckedItems`:

```typescript
// Before:
const isChecked = checkedItems.has(idx);

// After:
const isChecked = matchCheckedItems.has(idx);
```

### 3. **Reset State Between Questions**

Added reset logic when moving to next question:

```typescript
const nextQuestion = () => {
  // ...
  setUserAnswer('');
  setConversationTurnIndex(0);
  setConversationAnswers([]);
  setMatchCheckedItems(new Set()); // Reset match state
  setFeedback(null);
};
```

---

## 📝 Code Changes Made

### File: `src/App.tsx`

**1. Added state at top level (line 392):**
```typescript
const [matchCheckedItems, setMatchCheckedItems] = useState<Set<number>>(new Set());
```

**2. Removed conditional useState (line 3506):**
```typescript
// REMOVED:
// const [checkedItems, setCheckedItems] = React.useState<Set<number>>(new Set());

// Now uses top-level matchCheckedItems instead
```

**3. Updated all references (lines 3510, 3535, 3541, 3599):**
- `checkedItems` → `matchCheckedItems`
- `setCheckedItems` → `setMatchCheckedItems`

**4. Added reset logic (lines 1497, 1648, 1663):**
```typescript
setMatchCheckedItems(new Set());
```

---

## 🎓 React Hooks Rules Reminder

### ✅ DO:
- Call hooks at the **top level** of your component
- Call hooks in the **same order** every time
- Call hooks from React function components or custom hooks

### ❌ DON'T:
- Call hooks inside **conditionals** (if statements)
- Call hooks inside **loops**
- Call hooks inside **nested functions**
- Call hooks inside **IIFEs** (Immediately Invoked Function Expressions)

### Example:

```typescript
// ❌ WRONG
function Component() {
  if (condition) {
    const [state, setState] = useState(0); // Hook inside conditional!
  }
}

// ✅ CORRECT
function Component() {
  const [state, setState] = useState(0); // Hook at top level
  
  if (condition) {
    // Use the state here
  }
}
```

---

## ✅ What Now Works

### Before Fix:
- ❌ Conversation exercises cause black screen
- ❌ Console error about hooks
- ❌ App crashes when switching from match to conversation
- ❌ React sees inconsistent hook counts

### After Fix:
- ✅ Conversation exercises work perfectly
- ✅ No console errors
- ✅ Can switch between all question types smoothly
- ✅ React sees consistent hook counts
- ✅ Match categorization still works correctly
- ✅ State resets properly between questions

---

## 🧪 Testing

All question types now work without crashes:

1. ✅ **Match questions** - Categorization mode works
2. ✅ **Conversation questions** - No black screen, renders correctly
3. ✅ **Switching between types** - No errors
4. ✅ **Multiple choice** - Works normally
5. ✅ **Reading comprehension** - Works normally
6. ✅ **All other types** - Work normally

**Conversation Example Data (Now Works!):**
```json
{
  "type": "conversation",
  "text": "Two students discussing telc Reading Teil 1 strategy",
  "context": "Anna: Wie bereitest du dich auf Teil 1 vor?|Tom: Ich lese immer zuerst die {blank}, nicht den Text.|Anna: Gute Idee! Und was machst du bei 'Text sagt dazu {blank}'?|Tom: Ich prüfe, ob die Information direkt im Text steht. Wenn nicht, ist es {blank}.",
  "answer": ["Fragen", "nichts", "nicht erwähnt"]
}
```

---

## 📊 Files Modified

1. **src/App.tsx** (~10 lines changed)
   - Line 392: Added `matchCheckedItems` state at top level
   - Line 3506: Removed conditional `React.useState`
   - Lines 3510, 3535, 3541, 3599: Updated variable names
   - Lines 1497, 1648, 1663: Added state reset logic

---

## 🎯 Key Takeaway

**Never use hooks conditionally!**

The React team enforces this rule because:
1. Hooks rely on call order to maintain state
2. Conditional hooks break this ordering
3. React can't track which state belongs to which hook
4. Result: Crashes and unpredictable behavior

**Solution:** Always declare hooks at the top level, then use conditional logic with the state values.

---

## ✅ Complete!

The conversation type now works perfectly with no black screen or errors. The fix ensures React hooks are always called in the same order, regardless of question type.

**Ready to practice conversations!** 🎉
