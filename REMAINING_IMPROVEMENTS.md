# Remaining Fixes & Improvements - Action Plan

## ✅ COMPLETED (Just Now)

1. **Reading Comprehension** - Fixed!
   - ✅ Removed separate answer field
   - ✅ Made "Available Information" cards directly clickable
   - ✅ Fixed "Person E sucht..." showing in options
   - ✅ Better UI with single-click selection

2. **Multiple Choice** - Fixed!
   - ✅ Now handles options with hyphens: `"0 - all are used, 1-2 ads, 3 ads"`
   - ✅ Updated regex to split on comma-space before digits too

3. **Identify Type** - Fixed!
   - ✅ Removed duplicate question text on top
   - ✅ Cleaner UI with text shown only once

---

## 🚧 REMAINING WORK

### 1. Conversation Type - Major Improvements Needed ⚠️

**Current Issues:**
- Shows conversation twice when checking answers
- No immediate feedback per turn (only at end)
- No context/scenario description
- Limited to single blanks, should support multiple per turn
- Should support reply functionality (not just fill-blank)

**Proposed Solution:**
```typescript
// Better structure:
{
  "type": "conversation",
  "text": "Phone conversation: Making dinner plans",  // <-- Scenario description
  "context": "Sarah: Möchtest du {blank} essen gehen?|Max: Ja! Wann {blank} wir uns?|Sarah: Um {blank} Uhr?",
  "answer": ["mit mir", "treffen", "sieben"]
}
```

**New Features to Add:**
1. Show scenario description at top
2. Give immediate feedback (green/red) after each turn
3. Support multiple blanks per message
4. Keep conversation visible ONCE, not twice
5. Better visual design with chat-bubble style
6. Option for reply-type questions (not just blanks)

**Complexity:** HIGH - Requires significant refactoring

---

### 2. SRS Scheduling - Learning State Issues ⚠️

**Current Problem:**
- When all questions become "Learning", they stop appearing
- Learning questions should appear frequently until mastered
- Current system doesn't properly handle "due" timing for Learning state

**Proposed Fix:**
```typescript
// In session pool generation (around line 1700):
const getLearningInterval = (timesAnswered: number) => {
  if (timesAnswered < 3) return 0; // Immediate (New)
  if (timesAnswered < 6) return 5 * 60 * 1000; // 5 minutes (Learning)
  if (timesAnswered < 10) return 30 * 60 * 1000; // 30 minutes (Learning)
  return 24 * 60 * 60 * 1000; // 1 day (Mastered)
};

// When creating session pool:
const dueQuestions = allQuestions.filter(q => {
  const lastReviewed = q.lastReviewed ? new Date(q.lastReviewed).getTime() : 0;
  const now = Date.now();
  const interval = getLearningInterval(q.timesAnswered);
  const successRate = q.timesAnswered > 0 ? q.timesCorrect / q.timesAnswered : 0;
  
  // Always include if New or Weak
  if (q.timesAnswered === 0 || successRate < 0.5) return true;
  
  // Include Learning if due
  if (successRate >= 0.5 && successRate < 0.8) {
    return (now - lastReviewed) >= interval;
  }
  
  // Include Mastered if due (longer interval)
  if (successRate >= 0.8) {
    return (now - lastReviewed) >= interval * 3;
  }
  
  return false;
});

// If no questions due, include all Learning questions anyway
if (dueQuestions.length === 0) {
  return allQuestions.filter(q => {
    const successRate = q.timesAnswered > 0 ? q.timesCorrect / q.timesAnswered : 0;
    return successRate >= 0.5 && successRate < 0.8; // Learning state
  });
}
```

**Complexity:** MEDIUM - Logic changes needed

---

### 3. Update AI Prompt File (finalpromt.md) 📝

**Needs Updates:**
1. Reading comprehension - New clickable card format
2. Conversation - Enhanced with scenario description
3. Identity - Improved flexible format
4. Match - Interactive categorization mode
5. All recent UI/UX improvements

**Complexity:** LOW - Documentation only

---

## 📋 PRIORITY ORDER

### Priority 1 (DO NOW): SRS Scheduling Fix
**Why:** Affects core learning functionality
**Impact:** HIGH - Users can't practice properly
**Time:** 30 minutes
**File:** `src/App.tsx` (lines 1650-1750 approximately)

### Priority 2 (DO NEXT): Update AI Prompt
**Why:** People are generating new exercises
**Impact:** MEDIUM - Future exercises will be better
**Time:** 20 minutes
**File:** `finalpromt.md`

### Priority 3 (LATER): Conversation Improvements
**Why:** Complex refactor, works currently (just not ideal)
**Impact:** LOW-MEDIUM - UX improvement
**Time:** 2-3 hours
**File:** `src/App.tsx` (lines 3564-3800)

---

## 🔧 QUICK FIX for SRS (Copy-Paste Ready)

I can provide you with the exact code to fix the SRS scheduling issue right now. The key changes:

1. Add interval calculation based on success rate
2. Always include Learning questions if no others are due
3. Mastered questions appear after days, not immediately

Would you like me to:
- [ ] A) Fix SRS scheduling now (30 min)
- [ ] B) Update AI prompt file now (20 min)
- [ ] C) Do conversation improvements (2-3 hours)
- [ ] D) All of the above (sequential)

---

## 📊 Current Status

| Feature | Status | Priority | Time Needed |
|---------|--------|----------|-------------|
| Reading Comprehension | ✅ Fixed | - | Done |
| Multiple Choice | ✅ Fixed | - | Done |
| Identify Type | ✅ Fixed | - | Done |
| Match Categorization | ✅ Fixed (earlier) | - | Done |
| SRS Scheduling | ❌ Broken | 🔴 HIGH | 30 min |
| AI Prompt File | ⚠️ Outdated | 🟡 MEDIUM | 20 min |
| Conversation UI | ⚠️ Needs Work | 🟢 LOW | 2-3 hours |

---

## 💡 RECOMMENDATION

**Do this in order:**

1. **Now:** Fix SRS scheduling (most important for users)
2. **Today:** Update AI prompt file (helps future exercise generation)
3. **This Week:** Conversation improvements (nice-to-have UX polish)

The conversation improvements are the most complex and least critical. The current implementation works, it's just not perfect. Users can practice conversations, they just don't get immediate per-turn feedback.

---

*Want me to proceed with the SRS fix first?*
