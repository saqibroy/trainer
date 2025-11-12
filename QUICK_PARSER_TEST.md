# Quick Parser Test

Paste this small test to verify parsers quickly:

---EXERCISE---
title: 🔧 Error Correction Test
description: Test error correction parsing

questions:
Correct: Ich helfe der Mann. | Ich helfe dem Mann.
Correct: Das gehört den Kind. | Das gehört dem Kind.
---END---

---EXERCISE---
title: 🔀 Word Order Test
description: Test word order parsing

questions:
Word order: (ich / gebe / dem Mann / das Buch) | Ich gebe dem Mann das Buch
Word order: (er / hilft / mir / oft) | Er hilft mir oft
---END---

---EXERCISE---
title: 📖 Reading Test (Bug Fix)
description: Test OR logic for multiple answers

questions:
[READING] What is the answer? | yes||ja||correct
---END---
