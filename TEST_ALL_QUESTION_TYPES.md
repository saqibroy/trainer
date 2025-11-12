# Test Data - All 9 Question Types

Copy and paste this into your app to test all question types.

---EXERCISE---
title: ✅ Test Exercise 1 - Fill-in-Blank (Type 1)
description: |
  Testing the basic fill-in-blank question type.
  **Format:** `question | answer`

questions:
Ich gebe ___ Nachbarin die Schlüssel zurück. | der
Der Arzt hilft ___ Patienten bei der Therapie. | dem
Diese Wohnung gehört ___ Familie Müller. | der
---END---

---EXERCISE---
title: ✅ Test Exercise 2 - Transform (Type 2)
description: |
  Testing the transform question type with >> operator.
  **Format:** `source >> target`

questions:
das Kind >> den Kindern
die Studentin >> den Studentinnen
der Nachbar >> den Nachbarn
das Auto >> den Autos
---END---

---EXERCISE---
title: ✅ Test Exercise 3 - Multi-Blank (Type 3)
description: |
  Testing multi-blank questions with || separator.
  **Format:** `question || answer1 | answer2`

questions:
Ich kaufe ___ (mein Bruder) ___ (ein Geschenk). || meinem Bruder | ein Geschenk
Sie leiht ___ (ihre Kollegin) ___ (das Auto). || ihrer Kollegin | das Auto
Er schickt ___ (seine Eltern) ___ (eine Postkarte). || seinen Eltern | eine Postkarte
---END---

---EXERCISE---
title: ✅ Test Exercise 4 - Identify (Type 4)
description: |
  Testing identification questions with [IDENTIFY] tag.
  **Format:** `[IDENTIFY] text || label1 | label2`

questions:
[IDENTIFY] Ich schenke meiner Freundin ein Buch || meiner Freundin=DAT | ein Buch=AKK
[IDENTIFY] Er zeigt den Touristen die Sehenswürdigkeiten || den Touristen=DAT | die Sehenswürdigkeiten=AKK
[IDENTIFY] Sie erklärt dem Schüler die Grammatik || dem Schüler=DAT | die Grammatik=AKK
---END---

---EXERCISE---
title: ✅ Test Exercise 5 - Error Correction (Type 8 - NEW!)
description: |
  Testing the NEW error correction question type.
  **Format:** `Correct: [sentence with error] | [corrected sentence]`
  
  This type was previously NOT implemented!

questions:
Correct: Ich helfe der Mann im Garten. | Ich helfe dem Mann im Garten.
Correct: Das Buch gehört den Kind. | Das Buch gehört dem Kind.
Correct: Sie dankt die Kollegin für die Hilfe. | Sie dankt der Kollegin für die Hilfe.
Correct: Die Schuhe passen dem Kinder nicht. | Die Schuhe passen den Kindern nicht.
---END---

---EXERCISE---
title: ✅ Test Exercise 6 - Word Order (Type 9 - NEW!)
description: |
  Testing the NEW word order question type.
  **Format:** `Word order: (word1 / word2 / word3) | correct sentence`
  
  This type was previously NOT implemented!

questions:
Word order: (ich / gebe / dem Lehrer / das Buch / morgen) | Ich gebe dem Lehrer morgen das Buch
Word order: (er / zeigt / mir / seine neue Wohnung / heute) | Er zeigt mir heute seine neue Wohnung
Word order: (wir / schenken / den Kindern / Spielzeug / zu Weihnachten) | Wir schenken den Kindern zu Weihnachten Spielzeug
Word order: (sie / erklärt / ihrem Chef / das Problem / in der Besprechung) | Sie erklärt ihrem Chef in der Besprechung das Problem
---END---

---EXERCISE---
title: ✅ Test Exercise 7 - Writing (Type 5)
description: |
  Testing writing practice questions with self-assessment.
  **Format:** `[WRITING] prompt | sample answer`

questions:
[WRITING] Schreiben Sie einer Freundin über Ihren Deutschkurs (2-3 Sätze). | Der Deutschkurs gefällt mir sehr gut. Die Lehrerin hilft uns immer bei den Hausaufgaben. Ich danke ihr für die tolle Unterstützung.
[WRITING] Sie haben ein Problem mit Ihrer Wohnung. Schreiben Sie dem Vermieter (2-3 Sätze). | Die Heizung gehört zur Wohnung, aber sie funktioniert nicht. Das schadet meiner Gesundheit, weil es sehr kalt ist. Bitte antworten Sie mir bald.
---END---

---EXERCISE---
title: ✅ Test Exercise 8 - Speaking (Type 6)
description: |
  Testing speaking practice questions with self-assessment.
  **Format:** `[SPEAKING] question | sample answer`

questions:
[SPEAKING] Wem helfen Sie oft? (Antworten Sie in vollständigen Sätzen) | Ich helfe oft meiner Mutter im Haushalt. Ich helfe auch meinen Kollegen bei der Arbeit, wenn sie Fragen haben.
[SPEAKING] Was gefällt Ihnen an Berlin? (oder Ihrer Stadt) | Mir gefällt die Kultur in Berlin sehr gut. Die vielen Museen und Theater gefallen mir besonders. Auch die internationale Atmosphäre gefällt mir.
---END---

---EXERCISE---
title: ✅ Test Exercise 9 - Reading Comprehension (Type 7)
description: |
  Testing reading comprehension with multiple acceptable answers.
  **Format:** `[READING] question | answer1||answer2||answer3`
  
  **IMPORTANT:** This now uses OR logic - any ONE answer is accepted!
  Previously it incorrectly expected ALL answers.

questions:
[READING] Text: "Hallo! Mir gefällt es sehr gut in Berlin. Die Stadt ist fantastisch!" --- Was gefällt der Person in Berlin? | Die Stadt||Berlin||Es gefällt ihr sehr gut in Berlin
[READING] Text: "Maria hilft ihrer Mitbewohnerin beim Umzug." --- Wem hat Maria geholfen? | Ihrer Mitbewohnerin||Der Mitbewohnerin
[READING] Text: "Der Deutschkurs gehört einer privaten Sprachschule in Mitte." --- Wem gehört der Deutschkurs? | Einer privaten Sprachschule||Einer Sprachschule in Mitte||Einer privaten Sprachschule in Mitte
---END---
