# AI Exercise Generator - Format Quick Reference

## ⚠️ CRITICAL: Always Include Answers!

Every question MUST have an answer using the pipe `|` symbol.

---

## Quick Format Guide

### 1. Fill-in-Blank
```
Question with ___ blank | answer
```
**Example:**
```
Ich helfe ___ Frau. | der
Der Film gefällt ___ sehr. | mir
```

### 2. Transform
```
original >> transformed
```
**Example:**
```
das Kind >> den Kindern
ich helfe >> du hilfst
```

### 3. Multi-Blank (Double pipe ||)
```
Question with ___ ___ || answer1 | answer2
```
**Example:**
```
Ich gebe ___ (mein Bruder) ___ (ein Buch). || meinem Bruder | ein Buch
```

### 4. Multiple Choice (CHOICE tag required)
```
[CHOICE] Question with ___ | option1, option2, option3 | correct_answer
```
**Example:**
```
[CHOICE] Warum liest man zuerst die Fragen? | Um Zeit zu sparen, Um zu wissen wonach man sucht, Weil es Pflicht ist | Um zu wissen wonach man sucht
```

### 5. Reading Comprehension (READING tag)
```
[READING] Text: "..." --- Question? | Answer1||Answer2
```
**Example:**
```
[READING] Text: "Maria hilft ihrer Freundin." --- Wem hilft Maria? | Ihrer Freundin||Der Freundin
```

### 6. Word Order (ORDER tag)
```
[ORDER] word1 / word2 / word3 | Correct sentence
```
**Example:**
```
[ORDER] ich / helfe / oft / meiner Mutter | Ich helfe oft meiner Mutter
```

### 7. Cloze Passage (CLOZE tag, {blank} markers)
```
[CLOZE] Text with {blank} {blank} | answer1, answer2
```
**Example:**
```
[CLOZE] Ich schreibe {blank} heute. Der Kurs gefällt {blank} gut. | dir, mir
```

### 8. Matching (MATCH tag)
```
[MATCH] item1, item2 || match1, match2 | item1-match1, item2-match2
```
**Example:**
```
[MATCH] scannen, skimmen || Schlüsselwörter finden, Hauptidee verstehen | scannen-Schlüsselwörter finden, skimmen-Hauptidee verstehen
```

### 9. Error Correction
```
Correct: Wrong sentence | Corrected sentence
```
**Example:**
```
Correct: Ich helfe der Mann. | Ich helfe dem Mann.
```

### 10. Writing (WRITING tag)
```
[WRITING] Task prompt | Sample answer
```
**Example:**
```
[WRITING] Schreiben Sie 2 Sätze über Ihre Wohnung. | Ich wohne in Berlin. Die Wohnung gefällt mir sehr.
```

### 11. Speaking (SPEAKING tag)
```
[SPEAKING] Question prompt | Sample answer
```
**Example:**
```
[SPEAKING] Was machen Sie in Ihrer Freizeit? | Ich lese gern Bücher und gehe schwimmen.
```

### 12. Dialogue (DIALOGUE tag)
```
[DIALOGUE] Situation | Question | Response
```
**Example:**
```
[DIALOGUE] Sie sind beim Arzt. | Was fehlt Ihnen? | Mir tut der Kopf weh seit drei Tagen.
```

### 13. Identify (IDENTIFY tag)
```
[IDENTIFY] Sentence || element1=LABEL | element2=LABEL
```
**Example:**
```
[IDENTIFY] Ich gebe dem Kind den Ball || dem Kind=DAT | den Ball=AKK
```

---

## ❌ WRONG - What NOT to do

```
EXERCISE 1 — Multiple Choice

Frage 1:
Was macht man beim Scannen?
a) Option 1
b) Option 2
c) Option 3

Frage 2:
Warum...
a) ...
b) ...
```

**Problems:**
- ❌ No [CHOICE] tag
- ❌ "Frage 1:", "Frage 2:" format won't parse
- ❌ "a) b) c)" format won't parse
- ❌ No answer indicated with |
- ❌ Can't be imported into app

---

## ✅ CORRECT - Parseable format

```
---EXERCISE---
title: Reading Strategies Quiz
description: |
  Practice reading strategies for telc B1
  
  **Focus:** Understanding test strategies
  **Target:** 90% accuracy

questions:
[CHOICE] Was macht man beim Scannen? | Man liest jeden Satz, Man sucht nach Schlüsselwörtern, Man übersetzt alles | Man sucht nach Schlüsselwörtern
[CHOICE] Warum liest man zuerst die Fragen? | Um Zeit zu sparen, Um zu wissen wonach man sucht, Weil es Pflicht ist | Um zu wissen wonach man sucht
[CHOICE] Wie lange hat man für Teil 1? | 3 Minuten, 5 Minuten, 10 Minuten | 5 Minuten
---END---
```

**Why it works:**
- ✅ Has [CHOICE] tag
- ✅ One question per line
- ✅ Options separated by commas
- ✅ Answer after second pipe |
- ✅ Can be directly imported

---

## Exercise Structure

```
---EXERCISE---
title: [Title]
description: |
  [Description - can be multiple lines]
  **Focus:** ...
  **Target:** ...

questions:
[Question line 1 with | answer]
[Question line 2 with | answer]
[Question line 3 with | answer]
---END---
```

---

## Vocabulary Structure

```json
{
  "vocabulary": [
    {
      "word": "base form",
      "forms": ["form1", "form2", "form3"],
      "meaning": "English translation"
    },
    {
      "word": "helfen",
      "forms": ["helfen", "hilft", "half", "geholfen", "ich helfe", "du hilfst"],
      "meaning": "to help (+ Dativ)"
    }
  ]
}
```

---

## Complete Example

### User Pastes Their Lesson:
```
Reading Strategies:
1. Fragen zuerst lesen
2. Scannen für Keywords
3. Elimination bei Multiple Choice

Time: 5-6-5-6-3 minutes for Teil 1-5
```

### AI Generates (CORRECT):
```
---EXERCISE---
title: Reading Strategies - Multiple Choice
description: |
  Master telc B1 reading strategies!
  **Focus:** Test-taking techniques
  **Target:** 85% understanding

questions:
[CHOICE] Was macht man beim Scannen? | Jeden Satz lesen, Nach Schlüsselwörtern suchen, Alles übersetzen | Nach Schlüsselwörtern suchen
[CHOICE] Welche Methode hilft bei Multiple Choice? | Skimming, Elimination, Übersetzung | Elimination
[CHOICE] Wie viele Minuten hat man für Teil 1? | 3 Minuten, 5 Minuten, 10 Minuten | 5 Minuten
---END---
```

---

## Remember

1. **Every question needs an answer** - use pipe |
2. **Use correct format tags** - [CHOICE], [READING], [MATCH], etc.
3. **One question per line**
4. **No descriptive formats** - no "Frage 1:", no "a) b) c)"
5. **Test before providing** - make sure it can be parsed

---

## When AI Makes Mistakes

If AI generates:
```
Frage 1: Was...?
a) Option 1
b) Option 2
```

Tell AI:
"Use the EXACT format from the prompt:
[CHOICE] Was...? | Option 1, Option 2, Option 3 | Correct Answer"
