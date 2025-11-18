# JSON Bulk Import Format - Complete Guide

## Overview
The trainer app now supports **JSON format** for bulk importing exercises. This is the recommended format as it:
- ✅ Auto-creates topics (no manual topic creation needed)
- ✅ Type-safe and validated
- ✅ Easy to generate with AI tools
- ✅ Supports all question types
- ✅ Allows metadata (descriptions, instructions, etc.)

## Full JSON Schema

```json
{
  "topic": {
    "title": "Topic Name",                    // Required if creating new topic
    "description": "Topic description"        // Optional
  },
  "exercises": [
    {
      "name": "Exercise Name",                // Required
      "description": "Exercise description",  // Optional, supports markdown
      "instructions": "Custom instructions",  // Optional
      "questions": [
        {
          "type": "question-type",            // See question types below
          "text": "Question text",            // Required
          "answer": "Correct answer",         // Required
          "options": ["opt1", "opt2"],        // For choice type (optional)
          "context": "Additional context"     // Optional (used for match, cloze, etc.)
        }
      ]
    }
  ]
}
```

## Question Types

### 1. Multiple Choice (`choice`)
```json
{
  "type": "choice",
  "text": "Ich gebe ___ Mann das Buch.",
  "options": ["der", "dem", "den", "des"],
  "answer": "dem"
}
```

### 2. Fill in the Blank (`fill-blank`)
```json
{
  "type": "fill-blank",
  "text": "Sie hilft ___ Kind. (das)",
  "answer": "dem"
}
```

### 3. Transform (`transform`)
```json
{
  "type": "transform",
  "text": "ich >> Transform to dative",
  "answer": "mir"
}
```

### 4. Multiple Blanks (`multi-blank`)
```json
{
  "type": "multi-blank",
  "text": "___ Mann gibt ___ Frau ein Buch. (der, die)",
  "answer": ["Der", "der"]
}
```

### 5. Error Correction (`error-correction`)
```json
{
  "type": "error-correction",
  "text": "Ich gebe der Mann ein Buch.",
  "answer": "Ich gebe dem Mann ein Buch."
}
```

### 6. Word Order (`word-order`)
```json
{
  "type": "word-order",
  "text": "mit / Freund / ich / meinem / gehe / ins Kino",
  "answer": "Ich gehe mit meinem Freund ins Kino."
}
```

### 7. Matching (`match`)
```json
{
  "type": "match",
  "text": "ich, du, er",
  "context": "mir, dir, ihm",
  "answer": ["ich-mir", "du-dir", "er-ihm"]
}
```

### 8. Sentence Building/Order (`order`)
```json
{
  "type": "order",
  "text": "gehen / wir / heute / ins Kino",
  "answer": "Wir gehen heute ins Kino."
}
```

### 9. Cloze Passage (`cloze`)
```json
{
  "type": "cloze",
  "text": "Der Mann gibt {blank} Frau {blank} Buch.",
  "answer": ["der", "ein"]
}
```

### 10. Dialogue Practice (`dialogue`)
```json
{
  "type": "dialogue",
  "context": "You meet a friend at a café",
  "text": "Greet your friend and ask how they are",
  "answer": "Hallo! Wie geht es dir?"
}
```

### 11. Reading Comprehension (`reading`)
```json
{
  "type": "reading",
  "context": "Maria geht jeden Tag zur Schule. Sie lernt Deutsch.",
  "text": "Was macht Maria jeden Tag?",
  "answer": "Sie geht zur Schule."
}
```

### 12. Writing Practice (`writing`)
```json
{
  "type": "writing",
  "text": "Write a short paragraph about your daily routine",
  "answer": "Sample: Ich stehe um 7 Uhr auf. Dann frühstücke ich..."
}
```

### 13. Speaking Practice (`speaking`)
```json
{
  "type": "speaking",
  "text": "Describe your favorite hobby in German",
  "answer": "Sample response for reference"
}
```

### 14. Identify/Label (`identify`)
```json
{
  "type": "identify",
  "text": "Der Mann gibt der Frau ein Buch.",
  "answer": "Subject: Der Mann, Dative Object: der Frau, Accusative Object: ein Buch"
}
```

## Complete Example

```json
{
  "topic": {
    "title": "German B1 - Reflexive Verbs",
    "description": "Practice reflexive verbs in different tenses and cases"
  },
  "exercises": [
    {
      "name": "Basic Reflexive Verbs - Present",
      "description": "Learn common reflexive verbs in present tense",
      "questions": [
        {
          "type": "fill-blank",
          "text": "Ich wasche ___. (myself)",
          "answer": "mich"
        },
        {
          "type": "choice",
          "text": "Du interessierst ___ für Musik.",
          "options": ["dich", "dir", "sich", "mich"],
          "answer": "dich"
        }
      ]
    },
    {
      "name": "Reflexive Verbs with Dative",
      "questions": [
        {
          "type": "fill-blank",
          "text": "Ich putze ___ die Zähne.",
          "answer": "mir"
        },
        {
          "type": "error-correction",
          "text": "Er wäscht sich die Hände.",
          "answer": "Er wäscht sich die Hände."
        }
      ]
    }
  ]
}
```

## Usage

1. **Copy the JSON structure above**
2. **Fill in your content**
3. **Go to "Add Multiple Exercises" in the app**
4. **Paste the JSON**
5. **Click "Add Exercises"**

The app will:
- Create the topic if it doesn't exist
- Add all exercises to the topic
- Parse all questions with proper types
- Auto-select the newly created topic

## AI Generation Prompt

Use this prompt with Claude/GPT to generate exercises:

```
Generate German B1 level exercises for the topic: [TOPIC]

Return in JSON format:
{
  "topic": {
    "title": "Topic name",
    "description": "Brief description"
  },
  "exercises": [
    {
      "name": "Exercise name",
      "description": "What this exercise practices",
      "questions": [
        {
          "type": "choice|fill-blank|transform|etc",
          "text": "Question text",
          "answer": "Correct answer",
          "options": ["opt1", "opt2", "opt3", "opt4"]  // for choice type
        }
      ]
    }
  ]
}

Generate 3-5 exercises with 5-8 questions each.
Use varied question types: choice, fill-blank, transform, error-correction, word-order.
Focus on B1 level grammar and vocabulary.
```

## Benefits Over Text Format

| Feature | JSON Format | Text Format |
|---------|-------------|-------------|
| Topic auto-creation | ✅ Yes | ❌ No |
| Type validation | ✅ Yes | ⚠️ Limited |
| AI-friendly | ✅ Perfect | ⚠️ OK |
| All question types | ✅ Full support | ⚠️ Limited |
| Metadata support | ✅ Rich | ⚠️ Basic |
| Error handling | ✅ Clear errors | ⚠️ Silent fails |
| Human-readable | ✅ Yes | ✅ Yes |

## Backward Compatibility

The app still supports the old text format:
```
---EXERCISE---
title: Exercise Name
questions:
Question | Answer
---END---
```

Both formats work, but **JSON is strongly recommended** for new content.
