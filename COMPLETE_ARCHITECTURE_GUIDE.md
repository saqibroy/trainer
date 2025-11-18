# Complete Architecture & Integration Guide
## German B1 Tracker + Exercise Trainer Integration

## 🎯 System Overview

```
┌──────────────────────────────────────────────────────────┐
│  Parent App: German B1 Day-by-Day Tracker               │
│  - 60 days of structured curriculum                      │
│  - Daily topics, grammar points, vocabulary              │
│  - User progress tracking                                │
│  - "Generate Exercises" button per day                   │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ↓ Opens with topic context
┌──────────────────────────────────────────────────────────┐
│  Child App: Exercise Trainer (this app)                 │
│  - Receives day/topic via URL or props                   │
│  - Generates exercises via AI (Claude)                   │
│  - Interactive practice with SRS algorithm               │
│  - Tracks performance per exercise                       │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ↓ Stores to
┌──────────────────────────────────────────────────────────┐
│  Storage Layer                                           │
│  - Static JSON: /exercises/day-{N}.json                  │
│  - User Progress: localStorage (per device)              │
│  - Optional: Supabase for multi-device sync              │
└──────────────────────────────────────────────────────────┘
```

## 📁 Recommended File Structure

```
project-root/
├── packages/
│   ├── b1-tracker/                 # Parent app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── DayCard.tsx
│   │   │   │   ├── ProgressTracker.tsx
│   │   │   │   └── ExerciseButton.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useExerciseGenerator.ts
│   │   │   ├── services/
│   │   │   │   └── aiService.ts
│   │   │   └── data/
│   │   │       └── curriculum.ts
│   │   └── package.json
│   │
│   └── exercise-trainer/          # This app (child)
│       ├── src/
│       │   └── App.tsx
│       └── package.json
│
├── public/
│   └── exercises/                  # Generated exercises
│       ├── day-1-greetings.json
│       ├── day-2-dative.json
│       └── ...
│
└── scripts/
    ├── generate-all-exercises.ts   # Pre-generate script
    └── validate-exercises.ts       # Validation script
```

## 🔗 Integration Options

### **Option 1: URL Parameters (Simplest - Recommended for MVP)**

#### Parent App
```typescript
// b1-tracker/src/components/ExerciseButton.tsx
interface ExerciseButtonProps {
  day: number;
  topic: string;
  grammarPoints: string[];
}

export function ExerciseButton({ day, topic, grammarPoints }: ExerciseButtonProps) {
  const [hasExercises, setHasExercises] = useState(false);
  
  useEffect(() => {
    // Check if exercises exist
    fetch(`/exercises/day-${day}.json`)
      .then(res => res.ok)
      .then(exists => setHasExercises(exists))
      .catch(() => setHasExercises(false));
  }, [day]);
  
  const handleOpenExercises = () => {
    // Open in new tab/window
    const url = new URL('/exercises', window.location.origin);
    url.searchParams.set('day', day.toString());
    url.searchParams.set('topic', topic);
    url.searchParams.set('source', 'b1-tracker');
    
    window.open(url.toString(), '_blank');
  };
  
  const handleGenerateExercises = async () => {
    try {
      setLoading(true);
      
      // Call AI to generate
      const exercises = await generateExercises(topic, day, grammarPoints);
      
      // Save to public folder (would need server endpoint)
      await saveExercises(day, exercises);
      
      // Open trainer
      handleOpenExercises();
    } catch (error) {
      alert('Failed to generate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {hasExercises ? (
        <button onClick={handleOpenExercises}>
          📚 Practice Exercises
        </button>
      ) : (
        <button onClick={handleGenerateExercises}>
          ✨ Generate Exercises
        </button>
      )}
    </div>
  );
}
```

#### Exercise Trainer App
```typescript
// exercise-trainer/src/App.tsx
function App() {
  const [exercises, setExercises] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const day = params.get('day');
    const topic = params.get('topic');
    const source = params.get('source');
    
    if (day && topic) {
      // Load exercises for this day
      loadDayExercises(parseInt(day), topic);
    } else {
      // Normal app mode
      setLoading(false);
    }
  }, []);
  
  const loadDayExercises = async (day: number, topic: string) => {
    try {
      const res = await fetch(`/exercises/day-${day}.json`);
      if (res.ok) {
        const data = await res.json();
        
        // Auto-import exercises
        importExercisesFromJSON(data);
        
        // Auto-select topic
        const topicId = findOrCreateTopic(data.topic.title);
        setSelectedTopicId(topicId);
      }
    } catch (error) {
      console.error('Failed to load day exercises:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // ... rest of app
}
```

---

### **Option 2: React Component Library (Best for Tight Integration)**

#### Convert Exercise Trainer to Component
```typescript
// exercise-trainer/src/index.ts
export { ExerciseTrainer } from './ExerciseTrainer';
export type { ExerciseTrainerProps } from './types';
```

```typescript
// exercise-trainer/src/ExerciseTrainer.tsx
interface ExerciseTrainerProps {
  // Mode 1: Load from JSON
  exercisesUrl?: string;
  
  // Mode 2: Direct data
  exercises?: {
    topic: { title: string; description?: string };
    exercises: Exercise[];
  };
  
  // Mode 3: Generate from topic
  generateForTopic?: {
    day: number;
    topic: string;
    grammarPoints: string[];
  };
  
  // Callbacks
  onClose?: () => void;
  onComplete?: (stats: SessionStats) => void;
  
  // Customization
  theme?: 'light' | 'dark';
  sessionSize?: number;
}

export function ExerciseTrainer(props: ExerciseTrainerProps) {
  // All the current App.tsx logic here
  return (
    <div className="exercise-trainer-container">
      {/* Current UI */}
    </div>
  );
}
```

#### Parent App Usage
```typescript
// b1-tracker/src/components/DayView.tsx
import { ExerciseTrainer } from '@myapp/exercise-trainer';

function DayView({ day, topic, grammarPoints }) {
  const [showExercises, setShowExercises] = useState(false);
  
  return (
    <div>
      <h1>Day {day}: {topic}</h1>
      
      <button onClick={() => setShowExercises(true)}>
        Generate Exercises
      </button>
      
      {showExercises && (
        <ExerciseTrainer
          generateForTopic={{ day, topic, grammarPoints }}
          onClose={() => setShowExercises(false)}
          onComplete={(stats) => {
            console.log('Session complete:', stats);
            // Save progress to parent app
          }}
        />
      )}
    </div>
  );
}
```

#### Package Setup
```json
// exercise-trainer/package.json
{
  "name": "@myapp/exercise-trainer",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc && vite build --mode lib"
  }
}
```

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ExerciseTrainer',
      fileName: 'exercise-trainer'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
```

---

### **Option 3: iframe + postMessage (Full Separation)**

#### Parent App
```typescript
function DayView({ day, topic }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const openExercises = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    
    iframe.contentWindow.postMessage({
      type: 'LOAD_DAY',
      payload: {
        day,
        topic,
        exercisesUrl: `/exercises/day-${day}.json`
      }
    }, '*');
  };
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SESSION_COMPLETE') {
        console.log('Stats:', event.data.payload);
        // Save to parent app
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  return (
    <div>
      <button onClick={openExercises}>Open Exercises</button>
      
      <iframe
        ref={iframeRef}
        src="/exercises/index.html"
        style={{ width: '100%', height: '100vh' }}
      />
    </div>
  );
}
```

#### Exercise Trainer
```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'LOAD_DAY') {
      const { day, topic, exercisesUrl } = event.data.payload;
      loadDayExercises(day, topic, exercisesUrl);
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

const sendCompletionStats = (stats: SessionStats) => {
  window.parent.postMessage({
    type: 'SESSION_COMPLETE',
    payload: stats
  }, '*');
};
```

---

## 🗄️ Data Storage Strategy

### Static Exercises (Git + JSON)
```
public/exercises/
├── day-1-greetings.json
├── day-2-dative.json
├── ...
└── day-60-review.json
```

**Benefits:**
- ✅ Version controlled
- ✅ Can edit manually
- ✅ Fast loading (static files)
- ✅ Works offline (after initial load)
- ✅ Free (no database)

### User Progress (localStorage)
```typescript
interface UserProgress {
  [dayNumber: string]: {
    completed: boolean;
    lastPracticed: string;
    sessionsCompleted: number;
    averageAccuracy: number;
    questionStats: {
      [questionId: string]: {
        timesAnswered: number;
        timesCorrect: number;
        lastReviewed: string;
      };
    };
  };
}

// Save
localStorage.setItem('user-progress', JSON.stringify(progress));

// Load
const progress = JSON.parse(localStorage.getItem('user-progress') || '{}');
```

### Optional: Multi-Device Sync (Supabase)
```sql
-- Supabase schema
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users,
  day INTEGER,
  question_id TEXT,
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, day, question_id)
);

CREATE INDEX idx_user_progress ON user_progress(user_id, day);
```

```typescript
// Sync to Supabase
async function syncProgress(dayNumber: number, questionStats: QuestionStats[]) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert(
      questionStats.map(stat => ({
        user_id: user.id,
        day: dayNumber,
        question_id: stat.questionId,
        times_answered: stat.timesAnswered,
        times_correct: stat.timesCorrect,
        last_reviewed: stat.lastReviewed
      }))
    );
}
```

---

## 🤖 AI Integration Flow

### 1. One-Time Generation (Pre-generate all 60 days)
```typescript
// scripts/generate-all-exercises.ts
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const curriculum = [
  { day: 1, topic: "Greetings and Introductions", grammar: ["Present tense", "sein/haben"] },
  { day: 2, topic: "Dative Case", grammar: ["Dative articles", "Indirect objects"] },
  // ... 60 days
];

async function generateAll() {
  for (const { day, topic, grammar } of curriculum) {
    console.log(`Generating Day ${day}: ${topic}...`);
    
    const exercises = await generateExercises(topic, day, grammar);
    
    await fs.writeFile(
      `./public/exercises/day-${day}.json`,
      JSON.stringify(exercises, null, 2)
    );
    
    console.log(`✅ Day ${day} complete`);
    await new Promise(r => setTimeout(r, 1500)); // Rate limit
  }
}
```

**Cost:** 60 days × $0.02 = **$1.20 total**

### 2. On-Demand Generation (Generate when requested)
```typescript
// In parent app
async function handleGenerateExercises(day: number, topic: string) {
  // Check cache first
  const cached = localStorage.getItem(`exercises-day-${day}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Generate fresh
  const exercises = await generateExercises(topic, day);
  
  // Cache for future
  localStorage.setItem(`exercises-day-${day}`, JSON.stringify(exercises));
  
  return exercises;
}
```

---

## 🎨 UI/UX Improvements (Todo #2)

### Install DnD Kit
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Enhanced Question Types

#### 1. True/False (New)
```typescript
{showExercises && (
  <ExerciseTrainer
    generateForTopic={{ day, topic, grammarPoints }}
    onClose={() => setShowExercises(false)}
    onComplete={(stats) => {
      console.log('Session complete:', stats);
      // Save progress to parent app
    }}
  />
)}
```

Let me create this in a separate message for better organization.

---

## 🚀 Quick Start Guide

### Step 1: Keep Current Setup
Your exercise trainer is perfect as a **standalone app**.

### Step 2: Add URL Parameter Support
```typescript
// In App.tsx, add this at the top
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const day = params.get('day');
  
  if (day) {
    // Load exercises for this day
    fetch(`/exercises/day-${day}.json`)
      .then(res => res.json())
      .then(data => {
        // Auto-import
        addBulkFromJSON(data);
      });
  }
}, []);
```

### Step 3: Parent App Integration
```typescript
// In B1 tracker app
<button onClick={() => {
  window.open(`/exercises?day=${day}`, '_blank');
}}>
  Practice Exercises
</button>
```

### Step 4: Generate Exercises
Use the AI guide I created to set up Claude API and generate all exercises.

---

## 📊 Recommended Approach for Your Project

**Phase 1 (Now):** 
- ✅ JSON bulk import (DONE)
- ⏳ UI improvements (Todo #2)
- Keep as standalone app

**Phase 2 (After parent app is ready):**
- Add URL parameter support
- Simple window.open() integration
- Static JSON files for exercises

**Phase 3 (Future):**
- Convert to component library if needed
- Add Supabase for multi-device sync
- Add AI generation button in-app

**Cost:** ~$5-20/month total (Claude API + optional Supabase)

---

Would you like me to proceed with Todo #2 (UI improvements with DnD Kit)?
