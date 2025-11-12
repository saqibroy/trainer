# German Practice Trainer - Complete Usage Guide

## 📚 Question Types Explained

### 1. 📝 Fill-in-Blank (Basic)
**Use Case:** Standard grammar exercises where students fill in one missing word.

**Format:**
```
Question with ___ placeholder | answer
```

**Examples:**
```
Ich gebe ___ Nachbarin die Schlüssel | der
Der Arzt hilft ___ Patienten | dem
Diese Wohnung gehört ___ Familie Müller | der
```

**In Practice:**
- Student sees: "Ich gebe ___ Nachbarin die Schlüssel"
- Student types: "der"
- System checks if answer matches exactly (case-insensitive)

---

### 2. 🔄 Transform
**Use Case:** Grammar transformations like plural formation, case changes, verb conjugation.

**Format:**
```
Original form >> Transformed form
```

**Examples:**
```
der Freund >> den Freunden
das Kind >> den Kindern
die Studentin >> den Studentinnen
helfen >> hilft
```

**In Practice:**
- Student sees: "der Freund"
- Instructions: "Transform to plural dative"
- Student types: "den Freunden"

---

### 3. 🔢 Multiple Fill-in-Blanks
**Use Case:** Sentences with multiple blanks, dative + accusative exercises, multi-word answers.

**Format:**
```
Sentence with ___ (hint1) ___ (hint2) || answer1 | answer2
```

**Examples:**
```
Ich kaufe ___ (mein Bruder) ___ (ein Geschenk) || meinem Bruder | ein Geschenk
Sie leiht ___ (ihre Kollegin) ___ (das Auto) || ihrer Kollegin | das Auto
Er schickt ___ (seine Eltern) ___ (eine Postkarte) || seinen Eltern | eine Postkarte
```

**In Practice:**
- Student sees: "Ich kaufe ___ (mein Bruder) ___ (ein Geschenk)"
- Instructions: "Enter answers separated by commas"
- Student types: "meinem Bruder, ein Geschenk"
- System checks both answers in order

---

### 4. 🏷️ Identify/Label
**Use Case:** Identifying grammatical cases, parts of speech, sentence elements.

**Format:**
```
[IDENTIFY] Sentence || element1=label1 | element2=label2
```

**Examples:**
```
[IDENTIFY] Ich schenke meiner Freundin ein Buch || meiner Freundin=DAT | ein Buch=AKK
[IDENTIFY] Er zeigt den Touristen die Sehenswürdigkeiten || den Touristen=DAT | die Sehenswürdigkeiten=AKK
[IDENTIFY] Wir bringen unseren Nachbarn einen Kuchen || unseren Nachbarn=DAT | einen Kuchen=AKK
```

**In Practice:**
- Student sees: "Ich schenke meiner Freundin ein Buch"
- Instructions: "Label each part (e.g., word1=DAT, word2=AKK)"
- Student types: "meiner Freundin=DAT, ein Buch=AKK"
- System checks labels match exactly

---

## 📖 Creating Comprehensive Exercises

### Example: Complete Dative Practice Exercise

```
===DESCRIPTION===
# Dative Articles Practice

Practice using dative articles with common verbs.

**Grammar Rules:**
- Masculine/Neuter: dem
- Feminine: der
- Plural: den (+ add -n to noun if needed!)

**Common Dative Verbs:**
helfen, danken, gefallen, gehören, passen, antworten, gratulieren

**Examples:**
- Ich helfe **dem** Mann (masculine)
- Sie dankt **der** Lehrerin (feminine)
- Das gehört **den** Kindern (plural)

===QUESTIONS===

# Basic fill-in-blank
Ich gebe ___ Nachbarin die Schlüssel | der
Der Arzt hilft ___ Patienten | dem
Diese Wohnung gehört ___ Familie Müller | der

# Transform to plural dative
der Freund >> den Freunden
das Kind >> den Kindern
die Kollegin >> den Kolleginnen

# Multiple blanks with dative + accusative
Ich kaufe ___ (mein Bruder) ___ (ein Geschenk) || meinem Bruder | ein Geschenk
Sie leiht ___ (ihre Kollegin) ___ (das Auto) || ihrer Kollegin | das Auto

# Identify dative and accusative
[IDENTIFY] Ich schenke meiner Freundin ein Buch || meiner Freundin=DAT | ein Buch=AKK
[IDENTIFY] Er zeigt den Touristen die Stadt || den Touristen=DAT | die Stadt=AKK
```

---

## 🎯 Best Practices for Exercise Creation

### 1. **Start Simple, Build Complexity**
```
# Week 1: Basic articles
Ich helfe ___ Mann | dem
Sie dankt ___ Frau | der

# Week 2: Add context
Ich helfe ___ Mann im Garten | dem
Sie dankt ___ Frau für die Hilfe | der

# Week 3: Multiple blanks
Ich gebe ___ (der Mann) ___ (ein Buch) || dem Mann | ein Buch
```

### 2. **Use Consistent Patterns**
Group similar questions together:
```
# All masculine
Ich helfe ___ Lehrer | dem
Ich danke ___ Arzt | dem
Ich antworte ___ Chef | dem

# All feminine
Ich helfe ___ Lehrerin | der
Ich danke ___ Ärztin | der
Ich antworte ___ Chefin | der
```

### 3. **Mix Question Types**
```
# Fill-in (recognition)
Ich gebe ___ Kind ein Buch | dem

# Transform (production)
das Kind >> den Kindern

# Identify (analysis)
[IDENTIFY] Ich gebe dem Kind ein Buch || dem Kind=DAT | ein Buch=AKK
```

### 4. **Add Progressive Difficulty**
```
# Easy (clear context)
Ich gebe ___ Lehrer das Buch | dem

# Medium (less obvious)
Ich antworte ___ Freunden | den

# Hard (potential confusion)
Ich gratuliere ___ Kollegen zum Erfolg | den
```

---

## 🔄 Spaced Repetition System

### How It Works

The app automatically schedules review based on your performance:

**New Questions (Gray)**
- Never attempted
- Appear immediately in every session

**Weak Questions (Red)**
- Low accuracy (<60%)
- Appear in every session until improved
- **Priority: 50% of each session**

**Learning Questions (Yellow)**
- Moderate accuracy (60-85%)
- Review every 1+ days
- **Priority: 30% of each session**

**Mastered Questions (Green)**
- High accuracy (85%+) with 5+ correct answers
- Review every 7+ days
- **Priority: 5% of each session (maintenance)**

### Optimization Tips

1. **Session Size:** 
   - Beginners: 10-15 questions
   - Intermediate: 20-25 questions
   - Advanced: 25-30 questions

2. **Daily Practice:**
   - Better: 15 minutes daily
   - Not ideal: 2 hours once a week

3. **Focus Areas:**
   - The app automatically prioritizes weak areas
   - Trust the system's question selection

---

## 📊 Using Statistics Effectively

### Understanding Progress Metrics

**Overall Accuracy**
- Target 70%+ for good progress
- <50% = need to review fundamentals
- >85% = ready for next level

**Mastery Distribution**
- Ideal: Pyramid shape (few new, many mastered)
- Problem: Inverted (many weak, few mastered)

**Due Count**
- Review due questions promptly
- High due count = falling behind

### Strategy Based on Stats

**Scenario 1: Many Weak (Red) Questions**
```
Action:
- Reduce session size to 10
- Review grammar rules before practicing
- Focus on patterns, not memorization
```

**Scenario 2: Plateau (Stuck at 60-70%)**
```
Action:
- Add more transform/identify questions
- Review related exercises
- Take breaks between sessions
```

**Scenario 3: High Mastery (80%+ Green)**
```
Action:
- Increase session size
- Add more complex exercises
- Move to next topic
```

---

## 🎓 telc B1 Exam Preparation

### Recommended Exercise Structure

**Part 1: Recognition (40%)**
```
Fill-in-blank questions to build familiarity
Ich gebe ___ Mann das Buch | dem
```

**Part 2: Production (30%)**
```
Transform questions to practice creation
der Mann >> den Männern
```

**Part 3: Application (20%)**
```
Multi-blank for context usage
Ich gebe ___ (der Mann) ___ (das Buch) || dem Mann | das Buch
```

**Part 4: Analysis (10%)**
```
Identify for deep understanding
[IDENTIFY] Ich gebe dem Mann das Buch || dem Mann=DAT | das Buch=AKK
```

### Study Timeline

**4 Weeks Before Exam:**
- Add all relevant exercises
- Practice 20 minutes daily
- Focus on weak areas

**2 Weeks Before Exam:**
- Increase to 30 minutes daily
- Mix all question types
- Review all weak questions

**1 Week Before Exam:**
- Full practice sessions (30 questions)
- Time yourself
- Review mistakes immediately

**Day Before Exam:**
- Light review (10-15 questions)
- Focus on confidence boosters
- Get good rest!

---

## 💡 Pro Tips

### 1. **Keyboard Shortcuts**
- Enter = Submit answer (during practice)
- Automatic type detection (bulk add)

### 2. **Bulk Import from Textbook**
Copy exercises directly from PDFs:
```
1. Copy text from PDF
2. Format as: question | answer
3. Paste into bulk add
4. Let app detect question types
```

### 3. **Export/Backup** (Coming Soon)
Currently: Use browser DevTools
- F12 → Application → LocalStorage
- Copy `german-practice-data` value
- Save to text file

### 4. **Mobile Usage**
- Works on phones/tablets
- Responsive design
- Offline capable (PWA support coming)

---

## 🆘 Troubleshooting

### Questions Not Parsing Correctly

**Problem:** Bulk add skips some questions

**Solution:**
- Check format exactly matches examples
- One question per line
- Use correct separator (|, >>, ||)
- No extra spaces around separators

### Wrong Answers Marked Correct

**Problem:** Typo in answer key

**Solution:**
- Edit question in question list
- Delete and re-add with correct answer
- Remember: answers are case-insensitive

### Progress Not Saving

**Problem:** LocalStorage cleared

**Solution:**
- Check browser settings
- Disable "clear on exit"
- Consider manual backup

---

## 🚀 Advanced Features (Phase 2 - Coming Soon)

- Exercise import/export
- Shared exercise libraries
- Print-friendly view
- Reading comprehension type
- Audio pronunciation
- Progress charts/graphs
- Study streak tracking
- Daily goals

---

**Viel Erfolg beim Lernen! 🎯**
