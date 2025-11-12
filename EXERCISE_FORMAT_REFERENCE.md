# Quick Reference: Exercise Import Formats

## Single Exercise Format

```
title: [Your Exercise Title]

description ->
[Your multi-line description here]
[Supports **markdown** formatting]
[Can include examples and tips]

questions ->
[Question line 1]
[Question line 2]
...
```

## Multiple Exercises Format

```
---EXERCISE---
title: [Exercise 1 Title]
description: |
  [Multi-line description]
  [With proper indentation]

questions:
[Question line 1]
[Question line 2]
---END---

---EXERCISE---
title: [Exercise 2 Title]
description: |
  [Another description]

questions:
[More questions]
---END---
```

## Supported Question Formats

All question formats are now fully supported (14 types total):

### Core Types (4)
| Type | Format | Example | Auto-Grade |
|------|--------|---------|------------|
| Fill-in-blank | `question \| answer` | `Ich sehe ___ Hund. \| den` | ✅ Yes |
| Transform | `source >> target` | `der Freund >> den Freunden` | ✅ Yes |
| Multi-blank | `question \|\| answer1 \| answer2` | `Ich gebe ___ ___ \|\| dem Kind \| ein Buch` | ✅ Yes |
| Identify | `[IDENTIFY] text \|\| label1 \| label2` | `[IDENTIFY] Ich gebe dem Kind ein Buch \|\| dem Kind=DAT \| ein Buch=AKK` | ✅ Yes |

### Practice Types (3)
| Type | Format | Example | Auto-Grade |
|------|--------|---------|------------|
| Writing | `[WRITING] prompt \| sample` | `[WRITING] Describe your day \| Sample answer...` | ❌ Self-assess |
| Speaking | `[SPEAKING] prompt \| sample` | `[SPEAKING] Introduce yourself \| Sample answer...` | ❌ Self-assess |
| Dialogue 🆕 | `[DIALOGUE] situation \| turn \| sample` | `[DIALOGUE] Im Geschäft \| Was kann ich Ihnen zeigen? \| Sample...` | ❌ Self-assess |

### Comprehension Types (2)
| Type | Format | Example | Auto-Grade |
|------|--------|---------|------------|
| Reading | `[READING] question \| answer1\|\|answer2` | `[READING] What is it? \| The city\|\|Berlin` | ✅ Yes (OR logic) |
| Cloze 🆕 | `[CLOZE] text with {blank} \| ans1, ans2` | `[CLOZE] Ich helfe {blank} oft. \| dir` | ✅ Yes |

### Structure Types (5)
| Type | Format | Example | Auto-Grade |
|------|--------|---------|------------|
| Error Correction | `Correct: error \| fixed` | `Correct: Ich helfe der Mann. \| Ich helfe dem Mann.` | ✅ Yes |
| Word Order | `Word order: (words) \| sentence` | `Word order: (ich / gebe / ihm / es) \| Ich gebe es ihm` | ✅ Yes |
| Choice 🆕 | `[CHOICE] question \| opt1, opt2, opt3 \| correct` | `[CHOICE] Ich helfe ___. \| die, der, den \| der` | ✅ Yes |
| Match 🆕 | `[MATCH] itemsA \|\| itemsB \| pairs` | `[MATCH] helfen, danken \|\| mir, dir \| helfen-mir, danken-dir` | ✅ Yes |
| Order 🆕 | `[ORDER] word1 / word2 / word3 \| sentence` | `[ORDER] ich / helfe / dir \| ich helfe dir` | ✅ Yes |

**Notes:** 
- Reading questions with multiple answers (separated by ||) accept ANY ONE answer (OR logic)
- Matching exercise pairs can be in any order
- All new telc B1-focused types marked with 🆕

## Real Example

```
---EXERCISE---
title: Dative Case - Plural with -n Rule
description: |
  Practice transforming singular nouns to plural dative form.
  
  **Remember:** Add -n to plural dative (unless it ends in -s or -n already)

questions:
das Kind >> den Kindern
die Studentin >> den Studentinnen
das Auto >> den Autos
---END---

---EXERCISE---
title: Dative Verbs in Context
description: |
  Fill in the blanks with the correct verb form.

questions:
Ich ___ meiner Mutter oft. | helfe
Er ___ dir für die Hilfe. | dankt
Berlin ___ vielen Touristen. | gefällt
---END---
```

## Tips

- ✅ Always include `title:` line
- ✅ Use `description ->` or `description: |` for multi-line
- ✅ Start questions with `questions ->` or `questions:`
- ✅ Separate exercises with `---EXERCISE---`
- ✅ End with `---END---` (optional but recommended)
- ❌ Don't mix different delimiter styles in one paste
- ❌ Don't forget the colon after `title` and keywords
