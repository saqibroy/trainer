# Topics → Exercises → Questions Upgrade Guide

## 🎉 What's New?

The German Practice Trainer has been upgraded with a **hierarchical structure** that allows you to organize your practice materials much better!

### New Structure:
```
Topics
  └── Exercises
        └── Questions
```

**Before:** You had a flat list of exercises  
**Now:** You organize exercises into topics, making it easier to manage large collections of practice materials!

---

## 🚀 Quick Start

### 1. Create a Topic
1. Look at the left sidebar (Topics column)
2. Enter a topic name (e.g., "telc B1 Dative Practice")
3. Optionally add a description
4. Click "Create Topic"

### 2. Add Exercises to a Topic

**Option A: Add Single Exercise**
1. Select a topic from the left sidebar
2. In the middle column (Exercises), click "Add Single Exercise"
3. Paste your formatted exercise text
4. Click "Parse & Add Exercise"

**Option B: Add Multiple Exercises at Once**
1. Select a topic
2. Click "Add Multiple Exercises"
3. Paste multiple exercises using the `---EXERCISE---` format
4. Click "Parse & Add All Exercises"

### 3. Add Questions to an Exercise
1. Select a topic, then select an exercise
2. Use the "Add Questions" tab (same as before)
3. Add questions singularly or in bulk

---

## 📝 Exercise Formats

### Single Exercise Format

```
title: Transform to Plural Dative

description ->
Transform singular nouns with articles to plural dative form.

**The -n Rule:**
- In dative plural, add **-n** to the noun (if it doesn't already end in -n or -s)
- Article: Always **den**

**Transformation Pattern:**
- der Mann → den Männern
- die Frau → den Frauen
- das Kind → den Kindern

💡 **Tip:** Say it out loud - "den Kindern" sounds better than "den Kinder"

questions ->
das Kind >> den Kindern
die Studentin >> den Studentinnen
der Nachbar >> den Nachbarn
das Auto >> den Autos
die Kollegin >> den Kolleginnen
der Tourist >> den Touristen
das Restaurant >> den Restaurants
die Ärztin >> den Ärztinnen
```

**Key Points:**
- Must have `title:` line
- Description section starts with `description ->` or `description:`
- Questions section starts with `questions ->` or `questions:`
- Use existing question formats (>>, |, ||, [IDENTIFY], etc.)

---

### Multiple Exercises Format

```
---EXERCISE---
title: Transform to Plural Dative
description: |
  Transform singular nouns with articles to plural dative form.
  
  **The -n Rule:**
  - In dative plural, add **-n** to the noun

questions:
das Kind >> den Kindern
die Studentin >> den Studentinnen
der Nachbar >> den Nachbarn
---END---

---EXERCISE---
title: Dative Verbs Practice
description: |
  Fill in the blanks with correct dative verbs.
  
  **Common Dative Verbs:**
  - helfen (to help)
  - danken (to thank)

questions:
Ich ___ meiner Mutter im Haushalt. | helfe
Er ___ dem Lehrer für die Hilfe. | dankt
---END---

---EXERCISE---
title: Error Correction
description: |
  Find and correct the dative error in each sentence.

questions:
Correct: Ich helfe der Mann im Garten | Ich helfe dem Mann im Garten
Correct: Das Buch gehört den Kind | Das Buch gehört dem Kind
---END---
```

**Key Points:**
- Each exercise starts with `---EXERCISE---`
- Each exercise ends with `---END---` (optional but recommended)
- Use `description: |` for multi-line descriptions with proper indentation
- Questions use the same formats as before

---

## 🔄 Migration from Old Version

**Don't worry!** Your existing exercises are automatically migrated.

When you first load the upgraded app:
1. All your existing exercises are automatically moved to a topic called "My Exercises"
2. The topic is auto-selected
3. Everything works as before!

You can then:
- Rename the topic
- Create new topics
- Move exercises by copying them to new topics (manually for now)

---

## 💡 Benefits of the New Structure

### Better Organization
- **Group related exercises** (e.g., all telc B1 parts under one topic)
- **Separate by difficulty** (Beginner, Intermediate, Advanced)
- **Organize by exam sections** (Grammar, Vocabulary, Reading)

### Easier Import
- **Bulk add multiple exercises** with one paste operation
- **Pre-formatted content** from your TELC_B1_BULK_IMPORT.md works perfectly
- **Copy entire topic sections** from study materials

### Clearer Navigation
- **Three-column layout:** Topics → Exercises → Practice
- **Visual hierarchy** makes it easy to find what you need
- **Statistics at each level** (topic stats, exercise stats)

---

## 🎯 Example Use Cases

### Use Case 1: telc B1 Exam Preparation
```
Topic: telc B1 Dative Case
  ├── Exercise: Part 1 - Basic Articles
  ├── Exercise: Part 2.1 - Transform to Plural
  ├── Exercise: Part 2.2 - Sentences with Plural
  ├── Exercise: Part 3 - Dative Verbs
  ├── Exercise: Part 4.1 - Identify DAT/AKK
  ├── Exercise: Part 4.2 - Both Objects
  ├── Exercise: Part 4.3 - Word Order
  ├── Exercise: Part 6 - Error Correction
  └── Exercise: Part 9 - Dialogue Completion
```

### Use Case 2: Grammar Topics
```
Topic: German Articles
  ├── Exercise: Nominative Case
  ├── Exercise: Accusative Case
  ├── Exercise: Dative Case
  └── Exercise: Genitive Case

Topic: Verb Conjugation
  ├── Exercise: Present Tense
  ├── Exercise: Past Tense (Präteritum)
  ├── Exercise: Perfect Tense
  └── Exercise: Irregular Verbs
```

### Use Case 3: By Difficulty
```
Topic: Beginner Level (A1-A2)
  ├── Exercise: Basic Greetings
  ├── Exercise: Numbers 1-100
  └── Exercise: Common Verbs

Topic: Intermediate (B1-B2)
  ├── Exercise: Dative Case
  ├── Exercise: Subordinate Clauses
  └── Exercise: Passive Voice

Topic: Advanced (C1-C2)
  ├── Exercise: Subjunctive Mood
  ├── Exercise: Complex Sentences
  └── Exercise: Advanced Vocabulary
```

---

## 📊 Features Comparison

| Feature | Old System | New System |
|---------|-----------|------------|
| Organization | Flat list of exercises | Topics → Exercises hierarchy |
| Bulk Import | Questions only | Entire exercises with questions |
| Navigation | One sidebar | Three-column layout |
| Grouping | Manual naming | Topic-based grouping |
| Scalability | Limited | Handles 100+ exercises easily |

---

## 🔧 Tips & Best Practices

### Topic Naming
- ✅ **Good:** "telc B1 - Dative Case", "A2 Grammar - Articles"
- ❌ **Avoid:** "stuff", "practice", "misc"

### Description Usage
- Use Markdown for formatting (**bold**, *italic*, `code`)
- Include key learning objectives
- Add grammar rules or tips
- Link to related topics

### Exercise Organization
- **Keep related exercises together** in one topic
- **Use consistent naming** (Part 1, Part 2, etc.)
- **Order by difficulty** or logical progression
- **Limit exercises per topic** (aim for 5-15)

### Bulk Import Workflow
1. Prepare all exercises in a text file
2. Use `---EXERCISE---` delimiters
3. Paste everything at once
4. Review auto-generated questions
5. Edit individual exercises if needed

---

## 🐛 Troubleshooting

### "Could not parse exercise"
- Check for `title:` line
- Ensure `questions ->` or `questions:` is present
- Verify question format is correct

### Exercise appears with no questions
- Check if questions are in the right format
- Ensure there's no extra delimiter breaking the parse
- Try adding questions manually to test

### Old data not showing
- Check browser console for errors
- Clear localStorage and reimport if needed
- Migration should happen automatically

---

## 📱 Keyboard Shortcuts

- **Enter** - Confirm topic/exercise creation
- **Escape** - Close modal (coming soon)
- All existing practice shortcuts still work!

---

## 🎓 Migration Checklist

When upgrading from the old version:

- [ ] Backup your data (export before upgrading)
- [ ] Load the new version
- [ ] Verify all exercises are in "My Exercises" topic
- [ ] Create new topics for better organization
- [ ] Test bulk exercise import
- [ ] Reorganize exercises into topics
- [ ] Update your import workflow

---

## 🚀 Next Steps

1. **Try the bulk import** with your TELC_B1_BULK_IMPORT.md file
2. **Create topic-based organization** for your studies
3. **Use the new modals** for faster exercise creation
4. **Enjoy better navigation** with the three-column layout!

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Verify your format matches the examples
3. Test with a small example first
4. Export your data regularly as backup

---

**Happy Learning! 🎉**
