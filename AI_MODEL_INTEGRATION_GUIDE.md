# AI Model Integration Guide
## For German B1 Exercise Generation

## 🎯 Recommended Models (Ranked)

### 🥇 1. Claude 3.5 Sonnet (BEST CHOICE)
**Provider:** Anthropic  
**Model:** `claude-3-5-sonnet-20241022`

#### Why Claude for German B1?
- ✅ **Superior German language understanding** - Best grammar accuracy
- ✅ **CEFR-aware** - Understands A1, A2, B1, B2 levels explicitly
- ✅ **Structured output** - Excellent at generating valid JSON
- ✅ **Long context** - 200K tokens (can process large curricula)
- ✅ **Cost-effective** - Cheaper than GPT-4 for same quality
- ✅ **Fast** - 2-3 second response times
- ✅ **Pedagogically sound** - Creates appropriate learning progressions

#### Pricing
- **Input:** $3 per 1M tokens (~$0.003 per 1K tokens)
- **Output:** $15 per 1M tokens (~$0.015 per 1K tokens)
- **Per Exercise Set:** ~$0.01-0.03 (10-20 exercises with 50-100 questions)
- **Monthly Budget:** $20 = ~1000 exercise sets

#### Setup
```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY, // Store in .env
});

async function generateExercises(topic: string, day: number) {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    temperature: 0.7,
    messages: [{
      role: "user",
      content: `Generate German B1 level exercises for Day ${day}: ${topic}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "topic": {
    "title": "${topic}",
    "description": "Brief description for B1 learners"
  },
  "exercises": [
    {
      "name": "Exercise name",
      "description": "What this practices",
      "questions": [
        {
          "type": "choice|fill-blank|transform|error-correction|word-order",
          "text": "Question text in German",
          "answer": "Correct answer",
          "options": ["opt1", "opt2", "opt3", "opt4"]
        }
      ]
    }
  ]
}

Requirements:
- Create 4-5 exercises
- Each exercise: 5-8 questions
- Use varied question types (choice, fill-blank, transform, error-correction)
- B1 level: intermediate grammar, 800-1000 word vocabulary
- Progressive difficulty within each exercise
- Include hints in question text where helpful
- Natural, practical German that natives would use

Focus areas for B1:
- Dative/Accusative cases
- Modal verbs in past tense
- Subordinate clauses (weil, dass, wenn)
- Adjective endings
- Separable verbs
- Reflexive verbs`
    }]
  });
  
  const content = message.content[0].text;
  return JSON.parse(content);
}
```

#### Example Usage with Error Handling
```typescript
async function generateWithRetry(topic: string, day: number, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await generateExercises(topic, day);
      
      // Validate structure
      if (!result.topic || !result.exercises || !Array.isArray(result.exercises)) {
        throw new Error('Invalid response structure');
      }
      
      // Save to file
      const filename = `day-${day}-${topic.toLowerCase().replace(/\s+/g, '-')}.json`;
      await fs.writeFile(
        `./exercises/${filename}`,
        JSON.stringify(result, null, 2)
      );
      
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
    }
  }
}
```

---

### 🥈 2. OpenAI GPT-4o
**Provider:** OpenAI  
**Model:** `gpt-4o`

#### Pros
- ✅ Very good at German (slightly below Claude)
- ✅ JSON mode built-in (`response_format: { type: "json_object" }`)
- ✅ Fast and reliable
- ✅ Widely documented

#### Cons
- ❌ More expensive than Claude for same quality
- ❌ Less pedagogically sophisticated

#### Pricing
- **Input:** $2.50 per 1M tokens
- **Output:** $10 per 1M tokens
- **Per Exercise Set:** ~$0.015-0.04

#### Setup
```bash
npm install openai
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

async function generateExercises(topic: string, day: number) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert German language teacher specializing in CEFR B1 level. Generate exercises in valid JSON format only."
      },
      {
        role: "user",
        content: `Create B1 German exercises for: ${topic}...` // Same prompt as above
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

---

### 🥉 3. Google Gemini 2.0 Flash
**Provider:** Google AI  
**Model:** `gemini-2.0-flash-exp`

#### Pros
- ✅ **FREE tier** (up to 1,500 requests/day)
- ✅ Good at German
- ✅ JSON mode support
- ✅ Fast responses

#### Cons
- ❌ Less consistent than Claude/GPT-4
- ❌ Occasional formatting issues

#### Pricing (Paid Tier)
- **FREE:** 1,500 RPD (requests per day)
- **Paid:** $0.075 per 1M input tokens, $0.30 per 1M output tokens

#### Setup
```bash
npm install @google/generative-ai
```

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.VITE_GOOGLE_API_KEY);

async function generateExercises(topic: string, day: number) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent(
    `Generate B1 German exercises for: ${topic}...`
  );
  
  return JSON.parse(result.response.text());
}
```

---

### 🎓 4. Local Model: Llama 3.3 70B (FREE but Complex)
**Provider:** Meta (run locally or via Ollama)  
**Model:** `llama3.3:70b`

#### Pros
- ✅ **100% FREE**
- ✅ Complete privacy (no API calls)
- ✅ Can fine-tune on your data
- ✅ No rate limits

#### Cons
- ❌ Requires powerful GPU (24GB+ VRAM) or cloud instance
- ❌ Not as good at German as Claude/GPT-4
- ❌ Slower inference (5-10 seconds)
- ❌ Complex setup

#### Setup (Local with Ollama)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.3:70b

# Run
ollama run llama3.3:70b
```

```typescript
async function generateExercises(topic: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.3:70b',
      prompt: `Generate B1 German exercises...`,
      stream: false,
      format: 'json'
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.response);
}
```

---

## 🏗️ Implementation Architecture

### Option 1: Generate on Demand (Recommended)
```typescript
// In parent B1 tracker app
function DayView({ day, topic }) {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState(null);
  
  async function handleGenerateExercises() {
    setLoading(true);
    try {
      // Call AI to generate
      const result = await generateExercises(topic, day);
      
      // Save to localStorage or file
      localStorage.setItem(`exercises-day-${day}`, JSON.stringify(result));
      
      // Open trainer app with exercises
      openTrainerApp(result);
    } catch (error) {
      alert('Failed to generate exercises: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <button onClick={handleGenerateExercises} disabled={loading}>
      {loading ? 'Generating...' : '✨ Generate Exercises'}
    </button>
  );
}
```

### Option 2: Pre-generate All Exercises
```bash
# Script to generate all 60 days of exercises
node scripts/generate-all-exercises.js
```

```typescript
// generate-all-exercises.js
import fs from 'fs/promises';

const curriculum = [
  { day: 1, topic: "Greetings and Introductions" },
  { day: 2, topic: "Dative Case with Articles" },
  { day: 3, topic: "Modal Verbs in Past Tense" },
  // ... 60 days total
];

async function generateAll() {
  for (const { day, topic } of curriculum) {
    console.log(`Generating Day ${day}: ${topic}...`);
    
    try {
      const exercises = await generateExercises(topic, day);
      
      await fs.writeFile(
        `./public/exercises/day-${day}.json`,
        JSON.stringify(exercises, null, 2)
      );
      
      console.log(`✅ Day ${day} complete`);
      
      // Rate limiting (Claude: 50 RPM)
      await new Promise(r => setTimeout(r, 1500));
    } catch (error) {
      console.error(`❌ Day ${day} failed:`, error);
    }
  }
}

generateAll();
```

---

## 💰 Cost Comparison (1000 Exercise Sets)

| Model | Input Cost | Output Cost | Total | Quality |
|-------|-----------|-------------|-------|---------|
| **Claude 3.5 Sonnet** | $3 | $15 | **$18-25** | ⭐⭐⭐⭐⭐ |
| GPT-4o | $2.50 | $10 | $20-30 | ⭐⭐⭐⭐ |
| Gemini 2.0 Flash | $0.075 | $0.30 | **$5-8** | ⭐⭐⭐⭐ |
| Llama 3.3 70B | $0 | $0 | **FREE** | ⭐⭐⭐ |

---

## 🎯 My Final Recommendation

### For Production: **Claude 3.5 Sonnet**
- Best quality/price ratio
- Most pedagogically sound
- Reliable JSON output
- ~$20/month for unlimited generation

### For Development/Testing: **Gemini 2.0 Flash (FREE tier)**
- 1,500 requests/day is plenty
- Test your prompts
- Validate JSON structure
- Switch to Claude for production

### For Privacy/Offline: **Llama 3.3 70B**
- If you have GPU or cloud budget
- 100% private data
- Can fine-tune on your curriculum

---

## 📝 Optimal AI Prompt Template

```typescript
const EXERCISE_GENERATION_PROMPT = `You are an expert German language teacher specializing in CEFR B1 level curriculum design.

Generate exercises for Day ${day}: ${topic}

Return ONLY valid JSON (no markdown, no explanations):

{
  "topic": {
    "title": "${topic}",
    "description": "One sentence describing what learners will practice"
  },
  "exercises": [
    {
      "name": "Exercise name (specific and descriptive)",
      "description": "What grammar/vocabulary this targets",
      "questions": [
        {
          "type": "choice|fill-blank|transform|error-correction|word-order",
          "text": "Question in German with helpful context in parentheses",
          "answer": "Correct answer",
          "options": ["option1", "option2", "option3", "option4"] // for choice only
        }
      ]
    }
  ]
}

REQUIREMENTS:
1. Create 4-5 diverse exercises
2. Each exercise: 6-8 questions
3. Question types: 40% choice, 30% fill-blank, 20% transform, 10% error-correction
4. B1 complexity: intermediate grammar, practical vocabulary
5. Progressive difficulty: easy → medium → hard within each exercise
6. Include helpful hints in parentheses: "Ich gebe ___ Mann... (der)"
7. Natural German: how natives actually speak
8. Cultural context: real-life situations

B1 FOCUS AREAS:
- Cases: dative, accusative, genitive
- Verbs: perfect tense, modal verbs, reflexive verbs
- Clauses: weil, dass, wenn, obwohl
- Adjectives: comparative, superlative, endings
- Prepositions: two-way prepositions (an, auf, in)

QUALITY CHECKS:
✅ All German text is grammatically correct
✅ Questions have exactly one correct answer
✅ Distractors (wrong options) are plausible
✅ Vocabulary is appropriate for B1 (not A1, not C1)
✅ JSON is valid and parseable`;
```

---

## 🔄 Integration with Parent App

```typescript
// In parent B1 tracker app
interface DayTopic {
  day: number;
  topic: string;
  grammar: string[];
  vocabulary: string[];
}

function DayCard({ dayData }: { dayData: DayTopic }) {
  const [exercisesGenerated, setExercisesGenerated] = useState(false);
  
  useEffect(() => {
    // Check if exercises already exist
    const cached = localStorage.getItem(`exercises-day-${dayData.day}`);
    setExercisesGenerated(!!cached);
  }, [dayData.day]);
  
  async function handleGenerate() {
    const exercises = await generateExercises(dayData.topic, dayData.day);
    
    // Save for future
    localStorage.setItem(`exercises-day-${dayData.day}`, JSON.stringify(exercises));
    
    // Open trainer app
    openTrainerApp({
      exercises,
      day: dayData.day,
      topic: dayData.topic
    });
  }
  
  function handleOpenExisting() {
    const cached = JSON.parse(localStorage.getItem(`exercises-day-${dayData.day}`));
    openTrainerApp({ exercises: cached, day: dayData.day });
  }
  
  return (
    <div>
      <h3>Day {dayData.day}: {dayData.topic}</h3>
      {exercisesGenerated ? (
        <button onClick={handleOpenExisting}>
          📚 Practice Exercises
        </button>
      ) : (
        <button onClick={handleGenerate}>
          ✨ Generate Exercises
        </button>
      )}
    </div>
  );
}
```

Would you like me to:
1. Implement the Claude API integration?
2. Create the pre-generation script?
3. Set up the parent-child app communication?
