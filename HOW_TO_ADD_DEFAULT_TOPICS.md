# How to Add New Default Topics

## Quick Guide

Adding new default topics is now super easy! Just follow these 3 steps:

### Step 1: Create Your Topic JSON File

Create a new JSON file in `/src/topics/` folder (e.g., `work.json`, `food.json`, `travel.json`)

**Required Structure:**
```json
{
  "topic": {
    "title": "Your Topic Title",
    "description": "Topic description here"
  },
  "exercises": [
    {
      "name": "Exercise Name",
      "description": "Exercise description (supports Markdown)",
      "questions": [
        {
          "type": "choice",
          "text": "Question text with ___ blank",
          "context": "option1, option2, option3, option4",
          "answer": "option1"
        }
        // More questions...
      ]
    }
    // More exercises...
  ],
  "vocabulary": [
    {
      "word": "Arbeit",
      "forms": ["die Arbeit", "der Arbeit", "die Arbeiten"],
      "meaning": "work, job"
    }
    // More vocabulary...
  ]
}
```

### Step 2: Import the Topic in App.tsx

Open `/src/App.tsx` and add the import at the top (around line 9):

```typescript
// Import all default topics from /src/topics/ folder
import familyTopic from './topics/family.json';
import workTopic from './topics/work.json';      // ← Add this
import foodTopic from './topics/food.json';      // ← Add this
import travelTopic from './topics/travel.json';  // ← Add this
```

### Step 3: Register the Topic in Config

In the same file, find `DEFAULT_TOPICS_CONFIG` (around line 293) and add your new topics:

```typescript
const DEFAULT_TOPICS_CONFIG = [
  { data: familyTopic, id: 'default-family-topic' },
  { data: workTopic, id: 'default-work-topic' },      // ← Add this
  { data: foodTopic, id: 'default-food-topic' },      // ← Add this
  { data: travelTopic, id: 'default-travel-topic' },  // ← Add this
];
```

**Important:** The `id` MUST start with `default-` to prevent users from deleting it!

---

## That's It! 🎉

The app will automatically:
- ✅ Load all default topics for new users
- ✅ Merge default topics with existing user data for returning users
- ✅ Load all vocabulary from all default topics
- ✅ Prevent users from deleting default topics
- ✅ Show "Default" badge on default topics
- ✅ Keep default topics at the top of the list

---

## Example: Adding a "Work" Topic

### 1. Create `/src/topics/work.json`:
```json
{
  "topic": {
    "title": "Work & Career Vocabulary (B1)",
    "description": "Essential vocabulary for workplace and career discussions"
  },
  "exercises": [
    {
      "name": "Job Titles and Workplaces",
      "description": "Learn common job titles with correct articles",
      "questions": [
        {
          "type": "choice",
          "text": "___ Lehrer unterrichtet Deutsch.",
          "context": "Der, Die, Das, Den",
          "answer": "Der"
        },
        {
          "type": "fill-blank",
          "text": "Ich arbeite als ___ (engineer).",
          "answer": "Ingenieur"
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "word": "Arbeit",
      "forms": ["die Arbeit", "der Arbeit", "die Arbeiten"],
      "meaning": "work, job"
    },
    {
      "word": "Beruf",
      "forms": ["der Beruf", "des Berufs", "die Berufe"],
      "meaning": "profession, occupation"
    }
  ]
}
```

### 2. In `/src/App.tsx`, add import:
```typescript
import workTopic from './topics/work.json';
```

### 3. In `/src/App.tsx`, add to config:
```typescript
const DEFAULT_TOPICS_CONFIG = [
  { data: familyTopic, id: 'default-family-topic' },
  { data: workTopic, id: 'default-work-topic' },  // ← New!
];
```

### 4. Save and refresh!

Your new "Work & Career Vocabulary (B1)" topic will appear automatically with the blue "Default" badge!

---

## Question Types Reference

All 15 question types are supported:

1. **choice** - Multiple choice (4 options)
2. **fill-blank** - Fill in the blank
3. **multi-blank** - Multiple blanks in one sentence
4. **transform** - Transform sentence structure
5. **error-correction** - Find and correct errors
6. **word-order** - Arrange words in correct order
7. **match** - Match items (drag & drop)
8. **order** - Order items by sequence
9. **cloze** - Fill blanks in a passage
10. **reading** - Reading comprehension
11. **writing** - Free writing practice
12. **speaking** - Speaking practice prompts
13. **dialogue** - Complete dialogue
14. **identify** - Identify grammar/patterns
15. **conversation** - Interactive conversation with turns

---

## Color-Coding in Vocabulary

The app automatically color-codes vocabulary based on gender:

- 🔵 **Blue** = Masculine (der) - Forms starting with "der"
- 🔴 **Pink** = Feminine (die) - Forms starting with "die"
- 🟢 **Green** = Neuter (das) - Forms starting with "das"
- 🟡 **Yellow** = Other (verbs, adjectives, etc.)

**Make sure your vocabulary forms include articles:**
```json
{
  "word": "Vater",
  "forms": ["der Vater", "des Vaters", "die Väter"],  // ← Includes "der"
  "meaning": "father"
}
```

---

## Testing Your Topic

1. **Clear localStorage** (optional): Open browser console and run `localStorage.clear()` to test as new user
2. **Refresh the page**
3. **Check that your topic appears** with blue "Default" badge
4. **Test exercises** - click through questions
5. **Test vocabulary** - check that words are highlighted with correct colors
6. **Try to delete** - should be prevented with alert message

---

## Troubleshooting

### Topic not showing up?
- ✓ Check file path: `/src/topics/yourfile.json`
- ✓ Check import: `import yourTopic from './topics/yourfile.json';`
- ✓ Check config: `{ data: yourTopic, id: 'default-your-topic' }`
- ✓ ID must start with `default-`

### Vocabulary not highlighted?
- ✓ Check vocabulary forms include articles: `["der Vater", ...]`
- ✓ Check vocabulary array exists in JSON
- ✓ Check topicId matches in config

### JSON parse errors?
- ✓ Validate JSON structure at jsonlint.com
- ✓ Check all quotes are double quotes `"`
- ✓ Check no trailing commas
- ✓ Check all arrays and objects are properly closed

---

## Pro Tips

1. **Use the AI Prompt**: Use `AI_EXERCISE_GENERATOR_IMPROVED.md` to generate topic JSON with Claude/ChatGPT
2. **Test one topic at a time**: Add topics incrementally
3. **Keep consistent naming**: Use descriptive IDs like `default-food-vocabulary`
4. **Add variety**: Mix different question types for better learning
5. **Include context**: Use descriptions to explain grammar concepts

---

## Need More Help?

Check these files for examples:
- `/src/topics/family.json` - Complete working example
- `AI_EXERCISE_GENERATOR_IMPROVED.md` - AI prompt for generating topics
- `HOW_TO_USE_AI_PROMPT.md` - Guide for using the AI prompt

Happy teaching! 🎓
