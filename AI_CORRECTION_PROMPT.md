# 🚨 AI CORRECTION PROMPT - Use This When AI Gets Format Wrong

## Copy-Paste This to Your AI:

---

❌ **STOP! Your format is wrong and cannot be imported.**

I need exercises in **EXACT parseable format** with answers included.

## ✅ CORRECT Multiple Choice Format:

```
[CHOICE] Question with ___? | option1, option2, option3 | correct_answer
```

**Example:**
```
[CHOICE] Warum liest man zuerst die Fragen? | Um Zeit zu sparen, Um zu wissen wonach man sucht, Weil es Pflicht ist | Um zu wissen wonach man sucht
```

## ❌ WRONG Format (What you gave me):

```
Frage 1:
Warum liest man zuerst die Fragen?
a) Um Zeit zu sparen
b) Um zu wissen wonach man sucht
c) Weil es Pflicht ist
```

This **CANNOT be imported** into my app!

---

## Required Changes:

1. **Add [CHOICE] tag** at the start
2. **One question per line**
3. **Options separated by commas** (not a, b, c)
4. **Correct answer after second pipe |**
5. **No "Frage 1:", "Frage 2:"** - just the questions

---

## All Your Exercises Must Follow These Formats:

### Fill-in-Blank:
```
Question with ___ | answer
```

### Multiple Choice:
```
[CHOICE] Question | opt1, opt2, opt3 | correct
```

### Reading:
```
[READING] Text: "..." --- Question? | Answer
```

### Word Order:
```
[ORDER] word1 / word2 / word3 | Correct sentence
```

### Cloze:
```
[CLOZE] Text with {blank} {blank} | ans1, ans2
```

### Matching:
```
[MATCH] item1, item2 || match1, match2 | item1-match1, item2-match2
```

---

## Please REGENERATE all exercises using the CORRECT format above!

Make sure:
- ✅ Every question has an answer with pipe |
- ✅ Format tags [CHOICE], [READING], etc. are included
- ✅ One question per line
- ✅ No descriptive format like "Frage 1:"
- ✅ Can be copy-pasted directly into my app

---
