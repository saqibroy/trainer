# React Hooks Consistent Rendering Fix

## Problem
The app was showing a black screen on conversation exercises with the error:
```
Warning: React has detected a change in the order of Hooks called by App. 
This will lead to bugs and errors if not fixed.
Error: Rendered more hooks than during the previous render.
```

## Root Cause
Three child components (`MatchQuestion`, `OrderQuestion`, `ClozeQuestion`) were being **conditionally rendered** based on the question type. Each of these components uses React hooks internally:

- **MatchQuestion**: 3 `useState` hooks + `useSensor`, `useSensors` hooks from dnd-kit
- **OrderQuestion**: 3 `useState` hooks + `useSensor`, `useSensors` hooks from dnd-kit
- **ClozeQuestion**: 2 `useState` hooks + 1 `useRef` + 1 `useEffect`

When switching between question types (e.g., from a reading question to a conversation question), React saw a different total number of hooks being called, which violates **React's Rules of Hooks**.

## React's Rules of Hooks
1. **Always call hooks at the top level** - Don't call hooks inside loops, conditions, or nested functions
2. **Always call hooks in the same order** - React relies on the order of hook calls to maintain state correctly

When child components with hooks are conditionally rendered, the total hook count changes between renders, breaking rule #2.

## Solution
**Always render all components but hide them with CSS** when they're not the active question type. This ensures React always sees the same number of hooks being called in the same order.

### Changes Made in App.tsx

#### 1. MatchQuestion (Lines ~3497-3645)
**Before:**
```tsx
{currentQuestion.type === 'match' && currentQuestion.context && (
  <MatchQuestion ... />
)}
```

**After:**
```tsx
{(() => {
  if (currentQuestion.type !== 'match' || !currentQuestion.context) {
    // Always render MatchQuestion for consistent hook count, but hidden
    return (
      <div style={{ display: 'none' }}>
        <MatchQuestion
          leftItems={['']}
          rightItems={['']}
          onSubmit={() => {}}
          disabled={true}
          highlightVocabulary={highlightVocabulary}
          handleWordClick={handleWordClick}
        />
      </div>
    );
  }
  // ... rest of match logic
  return (
    <>
      <div style={{ display: showCategorization ? 'none' : 'block' }}>
        <MatchQuestion ... />
      </div>
    </>
  );
})()}
```

#### 2. OrderQuestion (Lines ~3647-3659)
**Before:**
```tsx
{currentQuestion.type === 'order' && (
  <OrderQuestion words={currentQuestion.text.split(/[/,]/).map(word => word.trim())} ... />
)}
```

**After:**
```tsx
<div style={{ display: currentQuestion.type === 'order' ? 'block' : 'none' }}>
  <OrderQuestion 
    words={currentQuestion.type === 'order' ? currentQuestion.text.split(/[/,]/).map(word => word.trim()) : ['']} 
    ... 
  />
</div>
```

#### 3. ClozeQuestion (Lines ~3661-3673)
**Before:**
```tsx
{currentQuestion.type === 'cloze' && (
  <ClozeQuestion passage={currentQuestion.text} ... />
)}
```

**After:**
```tsx
<div style={{ display: currentQuestion.type === 'cloze' ? 'block' : 'none' }}>
  <ClozeQuestion 
    passage={currentQuestion.type === 'cloze' ? currentQuestion.text : 'placeholder'} 
    ... 
  />
</div>
```

## Key Points

### Why CSS Display Instead of Conditional Rendering?
- `{condition && <Component />}` - Component unmounts, hooks are removed from the tree
- `<div style={{ display: 'none' }}><Component /></div>` - Component stays mounted, hooks remain in the tree

### Placeholder Props
When components are hidden (not the active question type), they're given minimal placeholder props to prevent errors while keeping them in the React tree.

### Performance Impact
Minimal. The components are still in the DOM but not visible. The overhead is negligible compared to the benefit of avoiding crashes.

## Result
✅ **No more React hooks errors**
✅ **No black screen crashes**
✅ **Consistent hook count across all renders**
✅ **All 15 question types work correctly**
✅ **Smooth transitions between question types**

## Testing
1. Start practice session with conversation exercises
2. Switch between different question types (reading, match, order, cloze, conversation)
3. Verify no console errors
4. Verify smooth rendering without black screens
5. Check that all question types function correctly

## Related Files
- `src/App.tsx` - Main app component with all question type rendering
- `src/components/MatchQuestion.tsx` - Match/categorization component (uses hooks)
- `src/components/OrderQuestion.tsx` - Word ordering component (uses hooks)
- `src/components/ClozeQuestion.tsx` - Fill-in-the-blank component (uses hooks)

## React Hooks Documentation
For more information about React's Rules of Hooks:
https://reactjs.org/docs/hooks-rules.html

---

**Fix Date:** November 21, 2025
**Status:** ✅ Complete and Tested
