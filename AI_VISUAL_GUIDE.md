# 🎯 VISUAL FORMAT GUIDE - Show This to AI

## The Problem You Had

```
❌ WRONG FORMAT (Cannot Import):

EXERCISE 1 — Multiple Choice (MCQ) — Basic Level

Frage 1:
Warum soll man laut Strategie immer zuerst die Fragen lesen?
a) Weil es die Texte kürzer macht
b) Weil man weiß, wonach man suchen muss
c) Weil es im telc nicht erlaubt ist, den Text zuerst zu lesen
```

## What AI Should Generate

```
✅ CORRECT FORMAT (Ready to Import):

---EXERCISE---
title: Reading Strategies - Basic Recognition
description: |
  Practice understanding telc B1 reading strategies
  **Focus:** Test-taking methods

questions:
[CHOICE] Warum soll man laut Strategie zuerst die Fragen lesen? | Weil es die Texte kürzer macht, Weil man weiß wonach man suchen muss, Weil es nicht erlaubt ist den Text zuerst zu lesen | Weil man weiß wonach man suchen muss
[CHOICE] Was macht man beim Scannen? | Man liest langsam jeden Satz, Man sucht nach Schlüsselwörtern, Man übersetzt den Text Wort für Wort | Man sucht nach Schlüsselwörtern
[CHOICE] Wofür ist die Zeitvorgabe (5-6-5-6-3) gedacht? | Für Grammatikübungen, Für die telc Teilaufgaben, Um Pausen zu planen | Für die telc Teilaufgaben
---END---
```

---

## Format Breakdown

### Structure
```
---EXERCISE---               ← Start marker
title: [Name]                ← Exercise title
description: |               ← Description starts
  Line 1                     ← Can be multiple lines
  Line 2
  **Bold:** text

questions:                   ← Questions section starts
[TYPE] Question | answer     ← Each question with answer
[TYPE] Question | answer
---END---                    ← End marker
```

### Multiple Choice Format
```
[CHOICE] Question text with ___? | option1, option2, option3 | correct_answer
         ↑                        ↑                          ↑
         Tag                      Options (commas)           Answer
```

**Example:**
```
[CHOICE] Der Film gefällt ___ sehr. | mir, mich, ich | mir
```

### Reading Comprehension Format
```
[READING] Text: "Quote from text" --- Question? | Answer1||Answer2
          ↑                         ↑            ↑
          Tag                       Separator    Alternative answers
```

**Example:**
```
[READING] Text: "Maria hilft ihrer Freundin beim Umzug." --- Wem hilft Maria? | Ihrer Freundin||Der Freundin
```

### Fill-in-Blank Format
```
Question text with ___ blank | answer
                             ↑
                             Single pipe
```

**Example:**
```
Ich helfe ___ Frau im Garten. | der
```

### Word Order Format
```
[ORDER] word1 / word2 / word3 / word4 | Complete correct sentence
        ↑                               ↑
        Words separated by /            Full answer
```

**Example:**
```
[ORDER] ich / helfe / oft / meiner Mutter | Ich helfe oft meiner Mutter
```

### Cloze Format
```
[CLOZE] Text with {blank} and {blank} in it | answer1, answer2
        ↑         ↑                           ↑
        Tag       Use {blank}                 Answers with commas
```

**Example:**
```
[CLOZE] Ich schreibe {blank} heute. Der Kurs gefällt {blank}. | dir, mir
```

### Matching Format
```
[MATCH] item1, item2, item3 || match1, match2, match3 | item1-match1, item2-match2, item3-match3
        ↑                      ↑                         ↑
        Items (commas)         Double pipe               Pairs (dashes)
```

**Example:**
```
[MATCH] scannen, skimmen || Schlüsselwörter finden, Hauptidee verstehen | scannen-Schlüsselwörter finden, skimmen-Hauptidee verstehen
```

---

## Complete Example From Start to Finish

### You Paste Your Lesson:
```
Week 1, Day 3
Reading Strategies for telc B1

1. Fragen zuerst lesen - Read questions first
2. Scannen - Scan for keywords
3. Zeit: 5-6-5-6-3 minutes

Vocabulary:
- jedoch = however
- trotzdem = nevertheless
```

### AI Generates:

```
# telc B1 Exercise Set: Reading Strategies

## SECTION 1: EXERCISES

---EXERCISE---
title: Reading Strategies - Basic Understanding
description: |
  Master the core telc B1 reading techniques!
  
  **Grammar Focus:** Test-taking vocabulary
  **telc Relevance:** Critical for all Leseverstehen parts
  **Target:** 90% accuracy

questions:
[CHOICE] Was bedeutet "Fragen zuerst lesen"? | Den Text zuerst lesen, Die Fragen vor dem Text lesen, Alle Wörter übersetzen | Die Fragen vor dem Text lesen
[CHOICE] Was macht man beim Scannen? | Langsam alles lesen, Nach Schlüsselwörtern suchen, Den Text übersetzen | Nach Schlüsselwörtern suchen
[CHOICE] Wie viele Minuten hat man für Teil 1? | 3 Minuten, 5 Minuten, 10 Minuten | 5 Minuten
Beim Lesen sollte man ___ die Fragen lesen. | zuerst
Das ___ hilft beim schnellen Finden von Informationen. | Scannen
---END---

---EXERCISE---
title: Connector Practice with Reading
description: |
  Use B1 connectors to link reading strategies!
  
  **Grammar Focus:** jedoch, trotzdem, deshalb
  **telc Relevance:** Schreiben Teil 2 & 3

questions:
[CLOZE] Der Text ist lang. {blank} kann man die Antworten schnell finden. | Trotzdem
Man sollte nicht alles lesen. {blank} spart man Zeit. | Deshalb
Die Aufgabe scheint schwer. {blank} ist sie machbar mit der richtigen Strategie. | Jedoch
---END---

---EXERCISE---
title: Reading Comprehension Practice
description: |
  Apply strategies to real text!
  
  **telc Relevance:** Exactly like Teil 3 format

questions:
[READING] Text: "Die telc B1 Prüfung testet, wie gut man relevante Informationen findet. Man muss nicht jedes Wort verstehen." --- Was testet die telc B1 Prüfung? | Wie gut man relevante Informationen findet||Das Finden wichtiger Informationen
[READING] Text: "Die telc B1 Prüfung testet, wie gut man relevante Informationen findet. Man muss nicht jedes Wort verstehen." --- Muss man jedes Wort verstehen? | Nein||Nein, man muss nicht jedes Wort verstehen
---END---

## SECTION 2: VOCABULARY

```json
{
  "vocabulary": [
    {
      "word": "jedoch",
      "forms": ["jedoch"],
      "meaning": "however, but"
    },
    {
      "word": "trotzdem",
      "forms": ["trotzdem"],
      "meaning": "nevertheless, still"
    },
    {
      "word": "deshalb",
      "forms": ["deshalb"],
      "meaning": "therefore, that's why"
    },
    {
      "word": "scannen",
      "forms": ["scannen", "scannt", "scannte", "gescannt"],
      "meaning": "to scan (for information)"
    },
    {
      "word": "Schlüsselwort",
      "forms": ["das Schlüsselwort", "die Schlüsselwörter"],
      "meaning": "keyword"
    },
    {
      "word": "relevant",
      "forms": ["relevant", "relevanter", "am relevantesten"],
      "meaning": "relevant"
    }
  ]
}
```
```

### You Copy-Paste Into Your App:
1. **Exercises Section** → "Bulk Import Exercises" button
2. **Vocabulary JSON** → "Bulk Import Vocabulary" button
3. **Start practicing!** → Vocabulary highlights automatically

---

## Key Differences - Side by Side

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| `Frage 1:` | `[CHOICE] Question |` |
| `a) Option` | `option1, option2` |
| No answer indicated | `| correct_answer` |
| Multi-line question | Single line question |
| Descriptive format | Parseable format |

---

## What Each Symbol Means

| Symbol | Meaning | Example |
|--------|---------|---------|
| `\|` | Single pipe - separates question from answer | `Question \| answer` |
| `\|\|` | Double pipe - separates complex parts | `Q ___ ___ \|\| ans1 \| ans2` |
| `___` | Blank to fill | `Ich helfe ___ Frau` |
| `{blank}` | Placeholder in cloze | `Text {blank} more` |
| `>>` | Transform arrow | `ich helfe >> du hilfst` |
| `/` | Word separator in ORDER | `word1 / word2 / word3` |
| `---` | Reading separator | `Text: "..." --- Question?` |
| `-` | Matching connector | `item1-match1` |
| `,` | List separator | `opt1, opt2, opt3` |

---

## Pro Tips

### ✅ DO:
- One question per line
- Include answer after pipe |
- Use format tags ([CHOICE], [READING], etc.)
- Keep questions clear and specific
- Test with 1-2 questions first

### ❌ DON'T:
- Use "Frage 1:", "Frage 2:" format
- Use "a) b) c)" format  
- Leave questions without answers
- Split questions across multiple lines
- Forget the [TAG] for special types

---

## Testing Your Output

Before giving to user, check:

```
✓ Does every question have | with answer?
✓ Are special types tagged? ([CHOICE], [READING], etc.)
✓ Is each question on ONE line?
✓ No "Frage 1:" or "a) b) c)" format?
✓ Can I copy-paste directly without editing?
```

If ALL ✓ = Ready to provide!
If ANY ✗ = Fix format first!

---

## Remember

**The app is a parser, not a human.**

It needs EXACT format to understand the exercises.

Think of it like writing code:
- Syntax matters
- Format matters  
- Symbols matter

One wrong format = Exercise won't import = User frustrated

**Get the format right = User happy = You successful!** 🎯
