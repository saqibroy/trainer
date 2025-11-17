import { useState, useEffect } from 'react';
import { Trash2, Plus, BookOpen, Target, Edit2, Check, X, Clock, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY = 'german-practice-data';

// Question interface with all required fields
interface Question {
  id: string;
  type: 'fill-blank' | 'transform' | 'multi-blank' | 'identify' | 'writing' | 'speaking' | 'reading' | 'error-correction' | 'word-order' | 'choice' | 'match' | 'order' | 'cloze' | 'dialogue';
  text: string;
  answer: string | string[]; // Array for multiple answers, or sample answer for practice-only types
  context?: string; // Optional context/hints - used for choices in CHOICE type, passage in CLOZE, etc.
  timesAnswered: number;
  timesCorrect: number;
  lastReviewed: string | null;
  createdAt: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string; // Markdown-supported exercise description
  instructions?: string; // Instructions shown before each question
  questions: Question[];
}

// NEW: Topic interface for organizing exercises
interface Topic {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  exercises: Exercise[];
}

// Vocabulary interface
interface VocabularyItem {
  id: string;
  word: string;
  forms: string[];
  meaning: string;
  createdAt: string;
}

// Parsed exercise structure from bulk import
interface ParsedExercise {
  title: string;
  description: string;
  questions: string[];
}

// Question type labels and descriptions
const QUESTION_TYPE_INFO = {
  'fill-blank': {
    label: 'Fill in Blank',
    icon: '📝',
    description: 'Complete the sentence with the correct word',
    autoGrade: true
  },
  'transform': {
    label: 'Transform',
    icon: '🔄',
    description: 'Transform the word/phrase according to instructions',
    autoGrade: true
  },
  'multi-blank': {
    label: 'Multiple Blanks',
    icon: '🔢',
    description: 'Fill in multiple blanks in the sentence',
    autoGrade: true
  },
  'identify': {
    label: 'Identify',
    icon: '🏷️',
    description: 'Label parts of the sentence',
    autoGrade: true
  },
  'writing': {
    label: 'Writing Practice',
    icon: '✍️',
    description: 'Write a response - compare with sample answer',
    autoGrade: false
  },
  'speaking': {
    label: 'Speaking Practice',
    icon: '🗣️',
    description: 'Oral response - check sample answer',
    autoGrade: false
  },
  'reading': {
    label: 'Reading Comprehension',
    icon: '📖',
    description: 'Read the text and answer questions',
    autoGrade: true
  },
  'error-correction': {
    label: 'Error Correction',
    icon: '🔧',
    description: 'Find and correct the grammatical error',
    autoGrade: true
  },
  'word-order': {
    label: 'Word Order',
    icon: '🔀',
    description: 'Arrange words in correct German sentence order',
    autoGrade: true
  },
  'choice': {
    label: 'Multiple Choice',
    icon: '☑️',
    description: 'Choose the correct answer from options',
    autoGrade: true
  },
  'match': {
    label: 'Matching Exercise',
    icon: '🔗',
    description: 'Match items from two columns',
    autoGrade: true
  },
  'order': {
    label: 'Sentence Building',
    icon: '🧩',
    description: 'Build a sentence from given words',
    autoGrade: true
  },
  'cloze': {
    label: 'Cloze Passage',
    icon: '📄',
    description: 'Fill in blanks in a text passage',
    autoGrade: true
  },
  'dialogue': {
    label: 'Dialogue Practice',
    icon: '💬',
    description: 'Practice conversational responses',
    autoGrade: false
  }
};

// Mastery levels based on correct percentage AND minimum attempts
const getMasteryLevel = (timesAnswered: number, timesCorrect: number): 'new' | 'weak' | 'middle' | 'mastered' => {
  if (timesAnswered === 0) return 'new';
  
  const percentage = (timesCorrect / timesAnswered) * 100;
  
  // Need minimum attempts before considering mastered
  if (timesAnswered < 3) {
    // Early stage - need more data
    if (percentage >= 66) return 'middle';
    return 'weak';
  } else if (timesAnswered < 5) {
    // Mid stage - can reach middle but not mastered yet
    if (percentage >= 80) return 'middle';
    if (percentage >= 50) return 'middle';
    return 'weak';
  } else {
    // Mature stage - can reach mastered (5+ attempts)
    if (percentage >= 80 && timesCorrect >= 5) return 'mastered';
    if (percentage >= 60) return 'middle';
    return 'weak';
  }
};

// Calculate days since last review
const getDaysSinceLastReview = (lastReviewed: string | null): number => {
  if (!lastReviewed) return Infinity;
  const now = new Date();
  const last = new Date(lastReviewed);
  const diffTime = Math.abs(now.getTime() - last.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get review interval based on mastery level (in days)
const getReviewInterval = (level: 'new' | 'weak' | 'middle' | 'mastered'): number => {
  const intervals = {
    new: 0,        // Show immediately
    weak: 0,       // Show every session
    middle: 1,     // Show if not seen for 1+ days
    mastered: 7    // Show if not seen for 7+ days
  };
  return intervals[level];
};

// Check if question is due for review
const isDueForReview = (timesAnswered: number, timesCorrect: number, lastReviewed: string | null): boolean => {
  const level = getMasteryLevel(timesAnswered, timesCorrect);
  const daysSince = getDaysSinceLastReview(lastReviewed);
  const interval = getReviewInterval(level);
  return daysSince >= interval;
};

const getMasteryColor = (level: string) => {
  const colors = {
    new: 'bg-gray-100 text-gray-700',
    weak: 'bg-red-100 text-red-700',
    middle: 'bg-yellow-100 text-yellow-700',
    mastered: 'bg-green-100 text-green-700'
  };
  return colors[level as keyof typeof colors];
};

const getMasteryLabel = (level: string) => {
  const labels = {
    new: 'New',
    weak: 'Weak',
    middle: 'Learning',
    mastered: 'Mastered'
  };
  return labels[level as keyof typeof labels];
};

// ========== EXERCISE PARSING FUNCTIONS ==========

// Parse a single exercise from text format
const parseSingleExercise = (text: string): ParsedExercise | null => {
  const lines = text.split('\n');
  let currentSection: 'title' | 'description' | 'questions' | null = null;
  let title = '';
  let descriptionLines: string[] = [];
  let questions: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect title line
    if (trimmed.startsWith('title:')) {
      currentSection = 'title';
      title = trimmed.replace('title:', '').trim();
    }
    // Detect description section
    else if (trimmed.startsWith('description') && (trimmed.includes(':') || trimmed.includes('->'))) {
      currentSection = 'description';
      continue; // Skip the "description:" line itself
    }
    // Detect questions section
    else if (trimmed.startsWith('questions') && (trimmed.includes(':') || trimmed.includes('->'))) {
      currentSection = 'questions';
      continue; // Skip the "questions:" line itself
    }
    // Add content to current section
    else if (currentSection === 'description' && line) {
      descriptionLines.push(line); // Keep original formatting for markdown
    }
    else if (currentSection === 'questions' && trimmed) {
      questions.push(trimmed);
    }
  }
  
  const description = descriptionLines.join('\n').trim();
  
  if (!title || questions.length === 0) return null;
  
  return { title, description, questions };
};

// Parse multiple exercises from text with ---EXERCISE--- delimiters
const parseMultipleExercises = (text: string): ParsedExercise[] => {
  const exercises: ParsedExercise[] = [];
  
  // Split by ---EXERCISE--- delimiter
  const blocks = text.split('---EXERCISE---').filter(b => b.trim());
  
  for (const block of blocks) {
    // Remove ---END--- if present
    const cleanBlock = block.replace(/---END---/g, '').trim();
    
    // Try to parse title
    const titleMatch = cleanBlock.match(/^title:\s*(.+?)$/m);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    
    // Try to parse description (everything between "description:" and "questions:")
    let description = '';
    const descMatch1 = cleanBlock.match(/description:\s*\|\s*\n([\s\S]*?)(?=\nquestions:)/);
    const descMatch2 = cleanBlock.match(/description:\s*\n([\s\S]*?)(?=\nquestions:)/);
    const descMatch3 = cleanBlock.match(/description\s*->\s*\n([\s\S]*?)(?=\nquestions)/);
    
    if (descMatch1) {
      description = descMatch1[1].trim();
    } else if (descMatch2) {
      description = descMatch2[1].trim();
    } else if (descMatch3) {
      description = descMatch3[1].trim();
    }
    
    // Try to parse questions (everything after "questions:")
    const questionsMatch = cleanBlock.match(/questions:\s*\n([\s\S]*?)$/);
    const questionsMatch2 = cleanBlock.match(/questions\s*->\s*\n([\s\S]*?)$/);
    
    let questions: string[] = [];
    if (questionsMatch) {
      questions = questionsMatch[1]
        .split('\n')
        .map(q => q.trim())
        .filter(q => q && !q.startsWith('---'));
    } else if (questionsMatch2) {
      questions = questionsMatch2[1]
        .split('\n')
        .map(q => q.trim())
        .filter(q => q && !q.startsWith('---'));
    }
    
    if (questions.length > 0) {
      exercises.push({ title, description, questions });
    }
  }
  
  return exercises;
};

// Migrate old exercises data to topics structure
const migrateToTopics = (oldExercises: Exercise[]): Topic[] => {
  if (oldExercises.length === 0) return [];
  
  // Create a default "My Exercises" topic for existing exercises
  return [{
    id: 'topic-default',
    title: 'My Exercises',
    description: 'Your practice exercises',
    createdAt: new Date().toISOString(),
    exercises: oldExercises
  }];
};

function App() {
  // State management - Topics instead of Exercises
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'add' | 'practice' | 'sessionComplete'>('list');
  
  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'topics' | 'exercises' | 'content'>('topics');
  
  // Topic management states
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState('');
  const [editingTopicDescription, setEditingTopicDescription] = useState('');
  
  // Exercise management states
  const [singleExerciseText, setSingleExerciseText] = useState('');
  const [bulkExercisesText, setBulkExercisesText] = useState('');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showBulkExerciseModal, setShowBulkExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  
  // Question management states
  const [singleQuestion, setSingleQuestion] = useState({ text: '', answer: '' });
  const [bulkText, setBulkText] = useState('');
  
  // Practice states
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string | string[] } | null>(null);
  const [sessionPool, setSessionPool] = useState<Question[]>([]);
  const [sessionSize, setSessionSize] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  // Vocabulary states
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [showAddVocabModal, setShowAddVocabModal] = useState(false);
  const [showBulkVocabModal, setShowBulkVocabModal] = useState(false);
  const [singleVocabWord, setSingleVocabWord] = useState('');
  const [singleVocabForms, setSingleVocabForms] = useState('');
  const [singleVocabMeaning, setSingleVocabMeaning] = useState('');
  const [bulkVocabText, setBulkVocabText] = useState('');

  // Load data from localStorage with migration support
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        
        // Check if data has topics or old exercises format
        if (data.topics) {
          setTopics(data.topics);
        } else if (data.exercises) {
          // Migrate old format to topics
          const migratedTopics = migrateToTopics(data.exercises);
          setTopics(migratedTopics);
          // Auto-select the migrated topic
          if (migratedTopics.length > 0) {
            setSelectedTopicId(migratedTopics[0].id);
          }
        }
        
        // Load vocabulary
        if (data.vocabulary) {
          setVocabulary(data.vocabulary);
        }
      } catch (e) {
        console.error('Failed to parse stored data');
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (topics.length > 0 || vocabulary.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ topics, vocabulary }));
    }
  }, [topics, vocabulary]);

  // ========== HELPER FUNCTIONS ==========
  
  // Get current topic
  const getCurrentTopic = (): Topic | undefined => {
    return topics.find(t => t.id === selectedTopicId);
  };

  // Get current exercise
  const getCurrentExercise = (): Exercise | undefined => {
    const topic = getCurrentTopic();
    if (!topic) return undefined;
    return topic.exercises.find(e => e.id === selectedExerciseId);
  };

  // Update topics with new data
  const updateTopics = (updater: (topics: Topic[]) => Topic[]) => {
    setTopics(updater(topics));
  };

  // ========== TOPIC CRUD FUNCTIONS ==========
  
  const createTopic = () => {
    if (!newTopicTitle.trim()) return;
    
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      title: newTopicTitle.trim(),
      description: newTopicDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      exercises: []
    };
    
    setTopics([...topics, newTopic]);
    setNewTopicTitle('');
    setNewTopicDescription('');
    setSelectedTopicId(newTopic.id);
    setMobileView('exercises'); // Auto-navigate on mobile
  };

  const deleteTopic = (topicId: string) => {
    if (window.confirm('Are you sure you want to delete this topic and all its exercises?')) {
      setTopics(topics.filter(t => t.id !== topicId));
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
        setSelectedExerciseId(null);
        setView('list');
      }
    }
  };

  const startEditTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingTopicTitle(topic.title);
    setEditingTopicDescription(topic.description || '');
  };

  const saveTopicEdit = () => {
    if (!editingTopicTitle.trim()) return;
    
    updateTopics(topics => topics.map(t => 
      t.id === editingTopicId 
        ? { ...t, title: editingTopicTitle.trim(), description: editingTopicDescription.trim() || undefined }
        : t
    ));
    setEditingTopicId(null);
    setEditingTopicTitle('');
    setEditingTopicDescription('');
  };

  // ========== EXERCISE CRUD FUNCTIONS ==========

  const addSingleExerciseFromText = () => {
    if (!singleExerciseText.trim() || !selectedTopicId) return;
    
    const parsed = parseSingleExercise(singleExerciseText);
    if (!parsed) {
      alert('Could not parse exercise. Please check the format.');
      return;
    }
    
    const newExercise: Exercise = {
      id: `exercise-${Date.now()}`,
      name: parsed.title,
      description: parsed.description || undefined,
      questions: []
    };
    
    // Parse questions
    const newQuestions: Question[] = [];
    parsed.questions.forEach((line, index) => {
      const parsedQ = parseQuestion(line);
      if (parsedQ) {
        newQuestions.push({
          id: `${Date.now()}-${index}-${Math.random()}`,
          ...parsedQ,
          timesAnswered: 0,
          timesCorrect: 0,
          lastReviewed: null,
          createdAt: new Date().toISOString()
        });
      }
    });
    
    newExercise.questions = newQuestions;
    
    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? { ...t, exercises: [...t.exercises, newExercise] }
        : t
    ));
    
    setSingleExerciseText('');
    setShowAddExerciseModal(false);
    setSelectedExerciseId(newExercise.id);
  };

  const addBulkExercisesFromText = () => {
    if (!bulkExercisesText.trim() || !selectedTopicId) return;
    
    const parsedExercises = parseMultipleExercises(bulkExercisesText);
    if (parsedExercises.length === 0) {
      alert('Could not parse any exercises. Please check the format.');
      return;
    }
    
    const newExercises: Exercise[] = parsedExercises.map((parsed, exIndex) => {
      const newQuestions: Question[] = [];
      
      parsed.questions.forEach((line, qIndex) => {
        const parsedQ = parseQuestion(line);
        if (parsedQ) {
          newQuestions.push({
            id: `${Date.now()}-ex${exIndex}-q${qIndex}-${Math.random()}`,
            ...parsedQ,
            timesAnswered: 0,
            timesCorrect: 0,
            lastReviewed: null,
            createdAt: new Date().toISOString()
          });
        }
      });
      
      return {
        id: `exercise-${Date.now()}-${exIndex}`,
        name: parsed.title,
        description: parsed.description || undefined,
        questions: newQuestions
      };
    });
    
    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? { ...t, exercises: [...t.exercises, ...newExercises] }
        : t
    ));
    
    setBulkExercisesText('');
    setShowBulkExerciseModal(false);
    alert(`Successfully added ${newExercises.length} exercises!`);
  };

  // Export all data to JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(topics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `german-trainer-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import data from JSON file (overwrites existing data)
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedTopics: Topic[] = JSON.parse(content);
        
        // Validate structure
        if (!Array.isArray(importedTopics)) {
          alert('Invalid file format. Expected an array of topics.');
          return;
        }
        
        // Confirm before overwriting
        const confirmed = window.confirm(
          `This will REPLACE all existing data with ${importedTopics.length} topic(s) from the file. Continue?`
        );
        
        if (confirmed) {
          setTopics(importedTopics);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(importedTopics));
          alert(`Successfully imported ${importedTopics.length} topic(s)!`);
        }
      } catch (error) {
        alert('Error reading file. Please ensure it\'s a valid JSON file exported from this app.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const deleteExercise = (exerciseId: string) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      updateTopics(topics => topics.map(t => 
        t.id === selectedTopicId
          ? { ...t, exercises: t.exercises.filter(e => e.id !== exerciseId) }
          : t
      ));
      
      if (selectedExerciseId === exerciseId) {
        setSelectedExerciseId(null);
        setView('list');
      }
    }
  };

  const startEditExercise = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setEditingName(exercise.name);
    setEditingDescription(exercise.description || '');
  };

  const saveExerciseName = () => {
    if (!editingName.trim() || !selectedTopicId) return;
    
    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? {
            ...t,
            exercises: t.exercises.map(e => 
              e.id === editingExerciseId 
                ? { ...e, name: editingName.trim(), description: editingDescription.trim() || undefined }
                : e
            )
          }
        : t
    ));
    
    setEditingExerciseId(null);
    setEditingName('');
    setEditingDescription('');
  };

  // Parse question and answer based on type
  const parseQuestion = (line: string): Omit<Question, 'id' | 'timesAnswered' | 'timesCorrect' | 'lastReviewed' | 'createdAt'> | null => {
    line = line.trim();
    if (!line) return null;

    // Error Correction type (using "Correct:")
    if (line.toLowerCase().startsWith('correct:')) {
      const cleanLine = line.replace(/^correct:/i, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'error-correction',
          text: parts[0], // sentence with error
          answer: parts[1] // corrected sentence
        };
      }
    }

    // Word Order type (using "Word order:")
    if (line.toLowerCase().startsWith('word order:')) {
      const cleanLine = line.replace(/^word order:/i, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'word-order',
          text: parts[0], // scrambled words (usually in parentheses)
          answer: parts[1] // correct sentence
        };
      }
    }

    // Multiple Choice type (using [CHOICE])
    // Format: [CHOICE] Question | Option1, Option2, Option3 | CorrectOption
    if (line.toLowerCase().includes('[choice]')) {
      const cleanLine = line.replace(/\[choice\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 3) {
        return {
          type: 'choice',
          text: parts[0], // question
          context: parts[1], // options comma-separated
          answer: parts[2] // correct option
        };
      }
    }

    // Matching Exercise type (using [MATCH])
    // Format: [MATCH] Item1, Item2, Item3 || Match1, Match2, Match3 | Pair1, Pair2, Pair3
    if (line.toLowerCase().includes('[match]')) {
      const cleanLine = line.replace(/\[match\]/gi, '').trim();
      const mainParts = cleanLine.split('|').map(p => p.trim());
      if (mainParts.length === 2) {
        const columnParts = mainParts[0].split('||').map(p => p.trim());
        if (columnParts.length === 2) {
          return {
            type: 'match',
            text: columnParts[0], // column A items (comma-separated)
            context: columnParts[1], // column B items (comma-separated)
            answer: mainParts[1].split(',').map(p => p.trim()) // correct pairs
          };
        }
      }
    }

    // Sentence Building/Order type (using [ORDER])
    // Format: [ORDER] word1 / word2 / word3 | Correct sentence
    if (line.toLowerCase().includes('[order]')) {
      const cleanLine = line.replace(/\[order\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'order',
          text: parts[0], // scrambled words (slash or comma separated)
          answer: parts[1] // correct sentence
        };
      }
    }

    // Cloze Passage type (using [CLOZE])
    // Format: [CLOZE] Text with {blank1}, {blank2}, etc. | answer1, answer2, answer3
    if (line.toLowerCase().includes('[cloze]')) {
      const cleanLine = line.replace(/\[cloze\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'cloze',
          text: parts[0], // passage with {blank} markers
          answer: parts[1].split(',').map(a => a.trim()) // answers in order
        };
      }
    }

    // Dialogue Practice type (using [DIALOGUE])
    // Format: [DIALOGUE] Context/Situation | Your prompt | Sample response
    if (line.toLowerCase().includes('[dialogue]')) {
      const cleanLine = line.replace(/\[dialogue\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 3) {
        return {
          type: 'dialogue',
          context: parts[0], // situation/context
          text: parts[1], // your turn prompt
          answer: parts[2] // sample response
        };
      }
    }

    // Writing practice type (using [WRITING])
    if (line.toLowerCase().includes('[writing]')) {
      const cleanLine = line.replace(/\[writing\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'writing',
          text: parts[0],
          answer: parts[1] // Sample answer
        };
      }
    }

    // Speaking practice type (using [SPEAKING])
    if (line.toLowerCase().includes('[speaking]')) {
      const cleanLine = line.replace(/\[speaking\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'speaking',
          text: parts[0],
          answer: parts[1] // Sample answer
        };
      }
    }

    // Reading comprehension type (using [READING])
    if (line.toLowerCase().includes('[reading]')) {
      const cleanLine = line.replace(/\[reading\]/gi, '').trim();
      const parts = cleanLine.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        // Support multiple possible answers
        const text = parts[0];
        const answers = parts.slice(1).join('||');
        if (answers.includes('||')) {
          return {
            type: 'reading',
            text,
            answer: answers.split('||').map(a => a.trim())
          };
        }
        return {
          type: 'reading',
          text,
          answer: parts[1]
        };
      }
    }

    // Transform type (using >>)
    if (line.includes('>>')) {
      const parts = line.split('>>').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'transform',
          text: parts[0],
          answer: parts[1]
        };
      }
    }

    // Multi-blank type (using ||)
    if (line.includes('||')) {
      const [text, answers] = line.split('||').map(p => p.trim());
      if (text && answers) {
        return {
          type: 'multi-blank',
          text,
          answer: answers.split('|').map(a => a.trim())
        };
      }
    }

    // Identify type (using [IDENTIFY])
    if (line.toLowerCase().includes('[identify]')) {
      const cleanLine = line.replace(/\[identify\]/gi, '').trim();
      const parts = cleanLine.split('||').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'identify',
          text: parts[0],
          answer: parts[1].split('|').map(a => a.trim())
        };
      }
    }

    // Default fill-blank type (using |)
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'fill-blank',
          text: parts[0],
          answer: parts[1]
        };
      }
    }

    return null;
  };

  // ========== QUESTION CRUD FUNCTIONS ==========
  
  const addSingleQuestion = () => {
    if (!singleQuestion.text.trim() || !singleQuestion.answer.trim() || !selectedTopicId || !selectedExerciseId) return;

    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      type: 'fill-blank',
      text: singleQuestion.text.trim(),
      answer: singleQuestion.answer.trim(),
      timesAnswered: 0,
      timesCorrect: 0,
      lastReviewed: null,
      createdAt: new Date().toISOString()
    };

    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? {
            ...t,
            exercises: t.exercises.map(e => 
              e.id === selectedExerciseId
                ? { ...e, questions: [...e.questions, newQuestion] }
                : e
            )
          }
        : t
    ));

    setSingleQuestion({ text: '', answer: '' });
  };

  const addBulkQuestions = () => {
    if (!bulkText.trim() || !selectedTopicId || !selectedExerciseId) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    const newQuestions: Question[] = [];

    lines.forEach((line, index) => {
      const parsed = parseQuestion(line);
      if (parsed) {
        newQuestions.push({
          id: `${Date.now()}-${index}-${Math.random()}`,
          ...parsed,
          timesAnswered: 0,
          timesCorrect: 0,
          lastReviewed: null,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (newQuestions.length > 0) {
      updateTopics(topics => topics.map(t => 
        t.id === selectedTopicId
          ? {
              ...t,
              exercises: t.exercises.map(e => 
                e.id === selectedExerciseId
                  ? { ...e, questions: [...e.questions, ...newQuestions] }
                  : e
              )
            }
          : t
      ));
      setBulkText('');
    }
  };

  const deleteQuestion = (questionId: string) => {
    if (!selectedTopicId || !selectedExerciseId) return;
    
    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? {
            ...t,
            exercises: t.exercises.map(e => 
              e.id === selectedExerciseId
                ? { ...e, questions: e.questions.filter(q => q.id !== questionId) }
                : e
            )
          }
        : t
    ));
  };

  // Create session pool using SRS algorithm
  const createSessionPool = (questions: Question[], size: number): Question[] => {
    // First, filter questions that are due for review based on their last review time
    const dueQuestions = questions.filter(q => isDueForReview(q.timesAnswered, q.timesCorrect, q.lastReviewed));
    
    // Group all questions by mastery level
    const newQ = dueQuestions.filter(q => getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'new');
    const weak = dueQuestions.filter(q => getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'weak');
    const middle = dueQuestions.filter(q => getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'middle');
    const mastered = dueQuestions.filter(q => getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'mastered');

    const pool: Question[] = [];
    const usedIds = new Set<string>();

    // Helper function to add questions with random selection
    const addFromCategory = (category: Question[], maxCount: number): number => {
      const available = category.filter(q => !usedIds.has(q.id));
      const toAdd = Math.min(maxCount, available.length);
      
      for (let i = 0; i < toAdd; i++) {
        if (available.length === 0) break;
        const randomIndex = Math.floor(Math.random() * available.length);
        const question = available[randomIndex];
        pool.push(question);
        usedIds.add(question.id);
        available.splice(randomIndex, 1);
      }
      
      return toAdd;
    };

    // Priority-based selection: New > Weak > Learning > Mastered
    // Add questions in priority order, filling up to the session size
    let remaining = size;
    
    // Priority 1: New questions (highest priority - all new questions should appear first)
    if (remaining > 0 && newQ.length > 0) {
      const added = addFromCategory(newQ, remaining);
      remaining -= added;
    }
    
    // Priority 2: Weak questions
    if (remaining > 0 && weak.length > 0) {
      const added = addFromCategory(weak, remaining);
      remaining -= added;
    }
    
    // Priority 3: Learning (middle) questions
    if (remaining > 0 && middle.length > 0) {
      const added = addFromCategory(middle, remaining);
      remaining -= added;
    }
    
    // Priority 4: Mastered questions (only if due for review)
    if (remaining > 0 && mastered.length > 0) {
      const added = addFromCategory(mastered, remaining);
      remaining -= added;
    }

    // Shuffle the pool to randomize order within the session
    return pool.sort(() => Math.random() - 0.5);
  };

  // ========== VOCABULARY CRUD FUNCTIONS ==========
  
  const addSingleVocab = () => {
    if (!singleVocabWord.trim() || !singleVocabMeaning.trim()) {
      alert('Please provide at least word and meaning');
      return;
    }
    
    const forms = singleVocabForms
      .split(',')
      .map(f => f.trim())
      .filter(f => f);
    
    const newVocab: VocabularyItem = {
      id: `vocab-${Date.now()}`,
      word: singleVocabWord.trim(),
      forms: forms.length > 0 ? forms : [singleVocabWord.trim()],
      meaning: singleVocabMeaning.trim(),
      createdAt: new Date().toISOString()
    };
    
    setVocabulary([...vocabulary, newVocab]);
    setSingleVocabWord('');
    setSingleVocabForms('');
    setSingleVocabMeaning('');
    setShowAddVocabModal(false);
  };

  const addBulkVocab = () => {
    if (!bulkVocabText.trim()) return;
    
    try {
      const parsed = JSON.parse(bulkVocabText);
      
      if (parsed.vocabulary && Array.isArray(parsed.vocabulary)) {
        const newVocab: VocabularyItem[] = parsed.vocabulary.map((item: any, index: number) => ({
          id: `vocab-${Date.now()}-${index}`,
          word: item.word,
          forms: item.forms || [item.word],
          meaning: item.meaning,
          createdAt: new Date().toISOString()
        }));
        
        setVocabulary([...vocabulary, ...newVocab]);
        setBulkVocabText('');
        setShowBulkVocabModal(false);
        alert(`Successfully imported ${newVocab.length} vocabulary words!`);
      } else {
        alert('Invalid format. Please provide JSON with "vocabulary" array.');
      }
    } catch (e) {
      alert('Invalid JSON format. Please check your input.');
    }
  };

  const deleteVocab = (vocabId: string) => {
    if (window.confirm('Delete this vocabulary word?')) {
      setVocabulary(vocabulary.filter(v => v.id !== vocabId));
    }
  };

  // ========== VOCABULARY HIGHLIGHTING FUNCTIONS ==========
  
  const highlightVocabulary = (text: string, onWordClick: (vocab: VocabularyItem) => void) => {
    if (!text || vocabulary.length === 0) {
      return <span>{text}</span>;
    }

    // Create a map of all forms to their vocabulary items
    const formToVocab = new Map<string, VocabularyItem>();
    vocabulary.forEach(vocab => {
      vocab.forms.forEach(form => {
        const normalizedForm = form.toLowerCase().replace(/^(der|die|das|den|dem|des|ein|eine|einem|einen|einer)\s+/, '');
        formToVocab.set(normalizedForm, vocab);
      });
    });

    // Split text into words while preserving punctuation and whitespace
    const tokens = text.split(/(\s+|[.,!?;:(){}[\]"'])/);
    
    return (
      <span>
        {tokens.map((token, idx) => {
          if (!token.trim()) return token; // Whitespace/punctuation
          
          const normalizedToken = token.toLowerCase().replace(/[.,!?;:(){}[\]"']/g, '');
          const vocab = formToVocab.get(normalizedToken);
          
          if (vocab) {
            return (
              <span
                key={idx}
                onClick={() => onWordClick(vocab)}
                className="underline decoration-2 decoration-yellow-400 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors rounded px-0.5"
                title={`Click to see meaning: ${vocab.meaning}`}
              >
                {token}
              </span>
            );
          }
          
          return <span key={idx}>{token}</span>;
        })}
      </span>
    );
  };

  const handleWordClick = (vocab: VocabularyItem) => {
    setSelectedWord(vocab);
    setShowVocabModal(true);
  };

  const startPractice = () => {
    const topic = getCurrentTopic();
    if (!topic) return;
    
    const exercise = topic.exercises.find(e => e.id === selectedExerciseId);
    if (!exercise || exercise.questions.length === 0) return;

    // Create a pool of questions for this session based on SRS
    const pool = createSessionPool(exercise.questions, Math.min(sessionSize, exercise.questions.length));
    
    if (pool.length === 0) return;

    // Reset session tracking
    setSessionPool(pool);
    setCurrentQuestionIndex(0);
    setSessionStats({ correct: 0, total: 0 });
    setCurrentQuestion(pool[0]);
    setUserAnswer('');
    setFeedback(null);
    setView('practice');
  };

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentQuestion || !selectedTopicId || !selectedExerciseId) return;

    let correct = false;
    const questionAnswer = currentQuestion.answer;

    // For practice-only types (writing/speaking/dialogue), show sample answer but don't auto-grade
    if (currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue') {
      // Just show the sample answer, user will self-assess
      setFeedback({ correct: false, correctAnswer: questionAnswer });
      // Update session stats to count as attempted (correct will be set by user's self-assessment)
      setSessionStats(prev => ({
        correct: prev.correct,
        total: prev.total + 1
      }));
      
      // Update question stats
      updateTopics(topics => topics.map(t => 
        t.id === selectedTopicId
          ? {
              ...t,
              exercises: t.exercises.map(e => 
                e.id === selectedExerciseId
                  ? {
                      ...e,
                      questions: e.questions.map(q => 
                        q.id === currentQuestion.id
                          ? {
                              ...q,
                              timesAnswered: q.timesAnswered + 1,
                              lastReviewed: new Date().toISOString()
                            }
                          : q
                      )
                    }
                  : e
              )
            }
          : t
      ));

      const updatedQuestion = {
        ...currentQuestion,
        timesAnswered: currentQuestion.timesAnswered + 1,
        lastReviewed: new Date().toISOString()
      };
      setCurrentQuestion(updatedQuestion);
      return;
    }

    // Auto-grade for other question types
    // Check answer based on question type
    if (Array.isArray(questionAnswer)) {
      // For reading comprehension: ANY one answer is acceptable (OR logic)
      if (currentQuestion.type === 'reading') {
        const userAnswerLower = userAnswer.trim().toLowerCase();
        const correctAnswers = questionAnswer.map(a => a.toLowerCase());
        correct = correctAnswers.some(ans => ans === userAnswerLower);
      } 
      // For cloze passages: ALL blanks must match in order
      else if (currentQuestion.type === 'cloze') {
        const userAnswersList = userAnswer.split(',').map(a => a.trim().toLowerCase());
        const correctAnswers = questionAnswer.map(a => a.toLowerCase());
        correct = userAnswersList.length === correctAnswers.length && 
                  userAnswersList.every((ans, idx) => ans === correctAnswers[idx]);
      }
      // For matching: Check if all pairs are correct (order doesn't matter)
      else if (currentQuestion.type === 'match') {
        const userPairs = userAnswer.split(',').map(p => p.trim().toLowerCase().replace(/\s+/g, ' '));
        const correctPairs = questionAnswer.map(p => p.toLowerCase().replace(/\s+/g, ' '));
        // Sort both arrays and compare
        const userSorted = [...userPairs].sort();
        const correctSorted = [...correctPairs].sort();
        correct = userSorted.length === correctSorted.length &&
                  userSorted.every((pair, idx) => pair === correctSorted[idx]);
      }
      // For multi-blank/identify: ALL answers required in order (AND logic)
      else {
        const userAnswersList = userAnswer.split(',').map(a => a.trim().toLowerCase());
        const correctAnswers = questionAnswer.map(a => a.toLowerCase());
        correct = userAnswersList.length === correctAnswers.length && 
                  userAnswersList.every((ans, idx) => ans === correctAnswers[idx]);
      }
    } else {
      // For fill-blank, transform, error-correction, word-order, order, choice - simple string match
      correct = userAnswer.trim().toLowerCase() === questionAnswer.toLowerCase();
    }
    
    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    // Update question with new stats and last reviewed time
    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? {
            ...t,
            exercises: t.exercises.map(e => 
              e.id === selectedExerciseId
                ? {
                    ...e,
                    questions: e.questions.map(q => 
                      q.id === currentQuestion.id
                        ? {
                            ...q,
                            timesAnswered: q.timesAnswered + 1,
                            timesCorrect: q.timesCorrect + (correct ? 1 : 0),
                            lastReviewed: new Date().toISOString()
                          }
                        : q
                    )
                  }
                : e
            )
          }
        : t
    ));

    // Also update the current question in session pool for immediate UI feedback
    const updatedQuestion = {
      ...currentQuestion,
      timesAnswered: currentQuestion.timesAnswered + 1,
      timesCorrect: currentQuestion.timesCorrect + (correct ? 1 : 0),
      lastReviewed: new Date().toISOString()
    };
    setCurrentQuestion(updatedQuestion);

    setFeedback({ correct, correctAnswer: questionAnswer });
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    // Check if session is complete
    if (nextIndex >= sessionPool.length) {
      setView('sessionComplete');
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setCurrentQuestion(sessionPool[nextIndex]);
    setUserAnswer('');
    setFeedback(null);
  };

  const endSession = () => {
    setView('sessionComplete');
  };

  const returnToMenu = () => {
    setView('add');
    setCurrentQuestion(null);
    setSessionPool([]);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setFeedback(null);
  };

  const resetProgress = () => {
    if (!window.confirm('Reset all progress for this exercise?') || !selectedTopicId || !selectedExerciseId) return;

    updateTopics(topics => topics.map(t => 
      t.id === selectedTopicId
        ? {
            ...t,
            exercises: t.exercises.map(e => 
              e.id === selectedExerciseId
                ? {
                    ...e,
                    questions: e.questions.map(q => ({
                      ...q,
                      timesAnswered: 0,
                      timesCorrect: 0,
                      lastReviewed: null
                    }))
                  }
                : e
            )
          }
        : t
    ));
  };

  // Get unique question types from an exercise
  const getExerciseQuestionTypes = (exercise: Exercise) => {
    if (!exercise || exercise.questions.length === 0) return [];
    
    const typeSet = new Set<Question['type']>();
    exercise.questions.forEach(q => typeSet.add(q.type));
    
    const types = Array.from(typeSet)
      .map(type => QUESTION_TYPE_INFO[type])
      .filter(info => info !== undefined);
    
    console.log('Exercise:', exercise.name, 'Types:', types); // Debug
    return types;
  };

  const getExerciseStats = (exercise: Exercise) => {
    if (!exercise || exercise.questions.length === 0) {
      return { total: 0, mastered: 0, middle: 0, weak: 0, new: 0, correctRate: 0, dueCount: 0 };
    }

    const stats = {
      total: exercise.questions.length,
      mastered: 0,
      middle: 0,
      weak: 0,
      new: 0,
      dueCount: 0
    };

    let totalAnswered = 0;
    let totalCorrect = 0;

    exercise.questions.forEach(q => {
      const level = getMasteryLevel(q.timesAnswered, q.timesCorrect);
      stats[level]++;
      totalAnswered += q.timesAnswered;
      totalCorrect += q.timesCorrect;
      
      if (isDueForReview(q.timesAnswered, q.timesCorrect, q.lastReviewed)) {
        stats.dueCount++;
      }
    });

    const correctRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return { ...stats, correctRate };
  };

  const getMasteryInfo = (timesAnswered: number, timesCorrect: number, lastReviewed: string | null) => {
    const level = getMasteryLevel(timesAnswered, timesCorrect);
    const percentage = timesAnswered > 0 ? (timesCorrect / timesAnswered) * 100 : 0;
    const daysSince = getDaysSinceLastReview(lastReviewed);
    const reviewInterval = getReviewInterval(level);
    const isDue = isDueForReview(timesAnswered, timesCorrect, lastReviewed);
    
    let nextMilestone = '';
    let reviewStatus = '';
    
    if (level === 'new') {
      nextMilestone = 'Answer to start learning';
      reviewStatus = 'Ready to start';
    } else if (level === 'weak') {
      const needed = Math.ceil(timesAnswered * 0.6) - timesCorrect;
      nextMilestone = needed > 0 ? `${needed} more correct for middle` : 'Keep practicing!';
      reviewStatus = isDue ? 'Due now' : 'Practice anytime';
    } else if (level === 'middle') {
      if (timesAnswered < 5) {
        nextMilestone = `${5 - timesAnswered} more attempts needed for mastered`;
      } else {
        const targetCorrect = Math.ceil(timesAnswered * 0.80);
        const needed = targetCorrect - timesCorrect;
        nextMilestone = needed > 0 ? `${needed} more correct for mastered (80% accuracy)` : 'Almost there!';
      }
      reviewStatus = isDue ? 'Due now' : `Review in ${reviewInterval - daysSince} days`;
    } else {
      nextMilestone = 'Mastered! Keep reviewing.';
      reviewStatus = isDue ? 'Due for review' : `Review in ${reviewInterval - daysSince} days`;
    }
    
    return { level, percentage, nextMilestone, reviewStatus, daysSince, isDue };
  };

  // Get selected topic and exercise
  const selectedTopic = getCurrentTopic();
  const selectedExercise = getCurrentExercise();
  const stats = selectedExercise ? getExerciseStats(selectedExercise) : null;

  // Calculate topic stats
  const getTopicStats = (topic: Topic) => {
    const totalQuestions = topic.exercises.reduce((sum, ex) => sum + ex.questions.length, 0);
    const totalExercises = topic.exercises.length;
    return { totalQuestions, totalExercises };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header - Responsive */}
        <header className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-900 mb-1 sm:mb-2">
            German B1 Trainer
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-indigo-600">
            Master German with spaced repetition
          </p>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden mb-3">
          <div className="bg-white rounded-lg shadow p-1 flex gap-1">
            <button
              onClick={() => setMobileView('topics')}
              className={`flex-1 py-2.5 px-2 rounded text-xs font-medium transition-colors ${
                mobileView === 'topics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📚 Topics
            </button>
            <button
              onClick={() => setMobileView('exercises')}
              className={`flex-1 py-2.5 px-2 rounded text-xs font-medium transition-colors ${
                mobileView === 'exercises'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              disabled={!selectedTopicId}
            >
              🎯 Exercises
            </button>
            <button
              onClick={() => setMobileView('content')}
              className={`flex-1 py-2.5 px-2 rounded text-xs font-medium transition-colors ${
                mobileView === 'content'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              disabled={!selectedExerciseId}
            >
              ✏️ Practice
            </button>
          </div>
        </div>

        {/* Grid Layout - Mobile shows one column, Desktop shows all three */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6">
          {/* LEFT SIDEBAR - Topics (Hidden on mobile unless active) */}
          <div className={`md:col-span-3 ${mobileView !== 'topics' ? 'hidden md:block' : 'block'}`}>
            <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Topics
              </h2>

              {/* Data Management - Always visible */}
              <div className="mb-4 pb-4 border-b space-y-2">
                <button
                  onClick={exportData}
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 flex items-center justify-center gap-1"
                  title="Export all app data to JSON file"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
                <label className="w-full bg-orange-600 text-white px-3 py-2 rounded-md text-sm hover:bg-orange-700 flex items-center justify-center gap-1 cursor-pointer"
                  title="Import data from JSON file (overwrites all existing data)">
                  <Upload className="w-4 h-4" />
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Vocabulary Management */}
              <div className="mb-4 pb-4 border-b">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Vocabulary ({vocabulary.length})</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAddVocabModal(true)}
                    className="w-full bg-teal-600 text-white px-3 py-2 rounded-md text-sm hover:bg-teal-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Word
                  </button>
                  <button
                    onClick={() => setShowBulkVocabModal(true)}
                    className="w-full bg-cyan-600 text-white px-3 py-2 rounded-md text-sm hover:bg-cyan-700 flex items-center justify-center"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Bulk Import
                  </button>
                  {vocabulary.length > 0 && (
                    <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2 space-y-1">
                      {vocabulary.slice(0, 5).map(vocab => (
                        <div key={vocab.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate flex-1">{vocab.word}</span>
                          <button
                            onClick={() => deleteVocab(vocab.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {vocabulary.length > 5 && (
                        <p className="text-xs text-gray-500 italic">+{vocabulary.length - 5} more...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Create Topic */}
              <div className="mb-4 pb-4 border-b">
                <input
                  type="text"
                  placeholder="New topic (e.g., telc B1 Dative)"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && createTopic()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 bg-white text-gray-900"
                />
                <textarea
                  placeholder="Topic description (optional)"
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 resize-none bg-white text-gray-900"
                />
                <button
                  onClick={createTopic}
                  className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Topic
                </button>
              </div>

              {/* Topics List */}
              <div className="space-y-2">
                {topics.map(topic => {
                  const topicStats = getTopicStats(topic);
                  const isEditingTopic = editingTopicId === topic.id;
                  
                  return (
                    <div
                      key={topic.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedTopicId === topic.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      {isEditingTopic ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingTopicTitle}
                            onChange={(e) => setEditingTopicTitle(e.target.value)}
                            placeholder="Topic title"
                            className="w-full px-2 py-1 border rounded text-sm bg-white text-gray-900"
                            autoFocus
                          />
                          <textarea
                            value={editingTopicDescription}
                            onChange={(e) => setEditingTopicDescription(e.target.value)}
                            placeholder="Topic description (optional)"
                            rows={2}
                            className="w-full px-2 py-1 border rounded text-sm resize-none bg-white text-gray-900"
                          />
                          <div className="flex gap-1">
                            <button onClick={saveTopicEdit} className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                              Save
                            </button>
                            <button onClick={() => {
                              setEditingTopicId(null);
                              setEditingTopicTitle('');
                              setEditingTopicDescription('');
                            }} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <button
                              onClick={() => {
                                setSelectedTopicId(topic.id);
                                setSelectedExerciseId(null);
                                setView('list');
                                setMobileView('exercises'); // Auto-navigate on mobile
                              }}
                              className="flex-1 text-left font-semibold text-gray-800 text-sm hover:text-indigo-600"
                            >
                              {topic.title}
                            </button>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditTopic(topic)}
                                className="text-gray-500 hover:text-indigo-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            {topicStats.totalExercises} exercises • {topicStats.totalQuestions} questions
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION - Exercises (Hidden on mobile unless active) */}
          <div className={`md:col-span-3 ${mobileView !== 'exercises' ? 'hidden md:block' : 'block'}`}>
            {selectedTopic ? (
              <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Exercises
                </h2>

                {/* Add Exercises Buttons */}
                <div className="mb-4 space-y-2 pb-4 border-b">
                  <button
                    onClick={() => setShowAddExerciseModal(true)}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Single Exercise
                  </button>
                  <button
                    onClick={() => setShowBulkExerciseModal(true)}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Multiple Exercises
                  </button>
                </div>

                {/* Exercises List */}
                <div className="space-y-2">
                  {selectedTopic.exercises.map(exercise => {
                    const exerciseStats = getExerciseStats(exercise);
                    const questionTypes = getExerciseQuestionTypes(exercise);
                    const isEditing = editingExerciseId === exercise.id;
                    
                    return (
                      <div
                        key={exercise.id}
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedExerciseId === exercise.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedExerciseId(exercise.id);
                            setView('add');
                            setMobileView('content'); // Auto-navigate on mobile
                          }
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Exercise name"
                              className="w-full px-2 py-1 border rounded text-sm bg-white text-gray-900"
                              autoFocus
                            />
                            <textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              placeholder="Exercise description (optional)"
                              rows={2}
                              className="w-full px-2 py-1 border rounded text-sm resize-none bg-white text-gray-900"
                            />
                            <div className="flex gap-1">
                              <button onClick={saveExerciseName} className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                                Save
                              </button>
                              <button onClick={() => {
                                setEditingExerciseId(null);
                                setEditingName('');
                                setEditingDescription('');
                              }} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 font-semibold text-gray-800 text-sm sm:text-base">
                                {exercise.name}
                              </div>
                              <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => startEditExercise(exercise)}
                                  className="text-gray-500 hover:text-indigo-600 p-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => deleteExercise(exercise.id)}
                                  className="text-gray-500 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Question Types Badges - More prominent */}
                            {questionTypes && questionTypes.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {questionTypes.map((typeInfo, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium border border-indigo-200"
                                    title={typeInfo.description}
                                  >
                                    <span className="mr-1">{typeInfo.icon}</span>
                                    <span>{typeInfo.label}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            <div className="text-xs sm:text-sm text-gray-600 mb-2">
                              {exerciseStats.total} questions
                            </div>
                            {exerciseStats.dueCount > 0 && (
                              <div className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 mb-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {exerciseStats.dueCount} due for review
                              </div>
                            )}
                            <div className="flex gap-1 flex-wrap">
                              {exerciseStats.mastered > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                  {exerciseStats.mastered}✓
                                </span>
                              )}
                              {exerciseStats.middle > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                                  {exerciseStats.middle}◐
                                </span>
                              )}
                              {exerciseStats.weak > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                  {exerciseStats.weak}✗
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Topic Selected</h3>
                <p className="text-gray-500">Select or create a topic to see exercises</p>
              </div>
            )}
          </div>

          {/* Main Content (Hidden on mobile unless active) */}
          <div className={`md:col-span-6 ${mobileView !== 'content' ? 'hidden md:block' : 'block'}`}>
            {!selectedExercise ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Exercise Selected</h3>
                <p className="text-gray-500">Create or select an exercise to get started</p>
              </div>
            ) : (
              <>
                {/* Navigation */}
                <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setView('add')}
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                          view === 'add'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Add Questions
                      </button>
                      <button
                        onClick={startPractice}
                        disabled={selectedExercise.questions.length === 0}
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                          view === 'practice' || view === 'sessionComplete'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Practice
                      </button>
                    </div>
                    
                    {/* Session Size Selector - only show when not in practice or session complete */}
                    {view !== 'practice' && view !== 'sessionComplete' && (
                      <div className="flex items-center gap-3 pt-2 border-t">
                        <label className="text-sm font-medium text-gray-700">
                          Session Size:
                        </label>
                        <select
                          value={sessionSize}
                          onChange={(e) => setSessionSize(Number(e.target.value))}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                        >
                          <option value={5}>5 questions</option>
                          <option value={10}>10 questions</option>
                          <option value={15}>15 questions</option>
                          <option value={20}>20 questions</option>
                        </select>
                        <span className="text-xs text-gray-500">
                          (Select before starting practice)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Card */}
                {stats && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Progress Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
                        <div className="text-xs text-gray-600">Mastered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.middle}</div>
                        <div className="text-xs text-gray-600">Learning</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.weak}</div>
                        <div className="text-xs text-gray-600">Weak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{stats.new}</div>
                        <div className="text-xs text-gray-600">New</div>
                      </div>
                    </div>
                    {stats.total > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Overall Accuracy</span>
                          <span className="text-lg font-bold text-indigo-600">{stats.correctRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-indigo-600 h-3 rounded-full transition-all"
                            style={{ width: `${stats.correctRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedExercise.questions.length > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-orange-800 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Due for Review
                            </div>
                            <div className="text-xs text-orange-600">questions ready to practice</div>
                          </div>
                          <div className="text-3xl font-bold text-orange-600">
                            {stats.dueCount}
                          </div>
                        </div>
                      </div>
                    )}
                    {stats.total > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={resetProgress}
                          className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm hover:bg-red-100"
                        >
                          Reset Progress
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Questions View */}
                {view === 'add' && (
                  <div className="space-y-6">
                    {/* Single Question */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Add Single Question</h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Question (use ___ for blank)"
                          value={singleQuestion.text}
                          onChange={(e) => setSingleQuestion({ ...singleQuestion, text: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                        <input
                          type="text"
                          placeholder="Correct answer"
                          value={singleQuestion.answer}
                          onChange={(e) => setSingleQuestion({ ...singleQuestion, answer: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                        <button
                          onClick={addSingleQuestion}
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                          Add Question
                        </button>
                      </div>
                    </div>

                    {/* Bulk Add */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Bulk Add Questions</h3>
                      <div className="mb-3 space-y-2 text-sm text-gray-600">
                        <p className="font-semibold">Supported formats:</p>
                        <div className="space-y-1 pl-4">
                          <p>📝 <strong>Fill-in-blank:</strong> <code className="bg-gray-100 px-2 py-1 rounded">Question with ___ | answer</code></p>
                          <p>🔄 <strong>Transform:</strong> <code className="bg-gray-100 px-2 py-1 rounded">der Freund &gt;&gt; den Freunden</code></p>
                          <p>🔢 <strong>Multi-blank:</strong> <code className="bg-gray-100 px-2 py-1 rounded">I ___ (word1) ___ (word2) || answer1 | answer2</code></p>
                          <p>🏷️ <strong>Identify:</strong> <code className="bg-gray-100 px-2 py-1 rounded">[IDENTIFY] Sentence || word1=DAT | word2=AKK</code></p>
                        </div>
                      </div>
                      <textarea
                        placeholder={"Ich sehe ___ Hund. | den\nder Freund >> den Freunden\nIch kaufe ___ (mein Bruder) ___ (ein Geschenk) || meinem Bruder | ein Geschenk\n[IDENTIFY] Ich schenke meiner Freundin ein Buch || meiner Freundin=DAT | ein Buch=AKK"}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm bg-white text-gray-900"
                      />
                      <button
                        onClick={addBulkQuestions}
                        className="w-full mt-3 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        Add All Questions
                      </button>
                    </div>

                    {/* Question List */}
                    {selectedExercise.questions.length > 0 && (
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                          Questions ({selectedExercise.questions.length})
                        </h3>
                        <div className="space-y-2">
                          {selectedExercise.questions.map(q => {
                            const info = getMasteryInfo(q.timesAnswered, q.timesCorrect, q.lastReviewed);
                            return (
                              <div key={q.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{QUESTION_TYPE_INFO[q.type].icon}</span>
                                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                                      {QUESTION_TYPE_INFO[q.type].label}
                                    </span>
                                  </div>
                                  <div className="font-medium text-gray-800">{q.text}</div>
                                  <div className="text-sm text-gray-600">
                                    Answer: <span className="font-semibold">
                                      {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`text-xs px-2 py-1 rounded ${getMasteryColor(info.level)}`}>
                                      {getMasteryLabel(info.level)}
                                    </span>
                                    {q.timesAnswered > 0 && (
                                      <>
                                        <span className="text-xs text-gray-500">
                                          {q.timesCorrect}/{q.timesAnswered} correct
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({Math.round(info.percentage)}%)
                                        </span>
                                      </>
                                    )}
                                    {info.isDue ? (
                                      <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Due now
                                      </span>
                                    ) : q.lastReviewed && info.level !== 'new' ? (
                                      <span className="text-xs text-gray-500">
                                        {info.reviewStatus}
                                      </span>
                                    ) : null}
                                  </div>
                                  {q.timesAnswered > 0 && (
                                    <div className="text-xs text-indigo-600 mt-1">
                                      {info.nextMilestone}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteQuestion(q.id)}
                                  className="ml-2 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Practice View */}
                {view === 'practice' && currentQuestion && selectedExercise && (
                  <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Exercise Description (if exists) - Shown at the very top */}
                    {selectedExercise.description && (
                      <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-lg shadow-sm">
                        <div className="flex items-center mb-3">
                          <BookOpen className="w-5 h-5 text-indigo-600 mr-2" />
                          <h3 className="text-lg font-bold text-indigo-900">{selectedExercise.name}</h3>
                        </div>
                        <div className="exercise-markdown text-gray-700 leading-relaxed">
                          <ReactMarkdown>{selectedExercise.description}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Session Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-3 py-1 rounded text-sm ${getMasteryColor(
                            getMasteryLevel(currentQuestion.timesAnswered, currentQuestion.timesCorrect)
                          )}`}>
                            {getMasteryLabel(getMasteryLevel(currentQuestion.timesAnswered, currentQuestion.timesCorrect))}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">
                            <span className="mr-1">{QUESTION_TYPE_INFO[currentQuestion.type].icon}</span>
                            {QUESTION_TYPE_INFO[currentQuestion.type].label}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">
                            Question {currentQuestionIndex + 1}/{sessionPool.length}
                          </div>
                          <div className="text-xs text-gray-600">
                            Score: {sessionStats.correct}/{sessionStats.total}
                            {sessionStats.total > 0 && (
                              <span className="ml-1">
                                ({Math.round((sessionStats.correct / sessionStats.total) * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${((currentQuestionIndex + 1) / sessionPool.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Statement - Clearly visible and prominent */}
                    {/* Only show for types where question text is the main prompt, not part of the interface */}
                    {!['error-correction', 'word-order', 'choice', 'match', 'order', 'cloze', 'dialogue'].includes(currentQuestion.type) && (
                      <div className="mb-8 p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-sm">
                        <div className="flex items-start mb-2">
                          <Target className="w-6 h-6 text-indigo-600 mr-3 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 leading-relaxed">
                              {highlightVocabulary(currentQuestion.text, handleWordClick)}
                            </h3>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Answer Input Area */}
                    <div className="mb-8">
                      {/* Different input types based on question type */}
                      {currentQuestion.type === 'fill-blank' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer:</label>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                            disabled={feedback !== null}
                            placeholder="Type your answer..."
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                            autoFocus
                          />
                        </div>
                      )}

                      {currentQuestion.type === 'transform' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Transform the word/phrase:</label>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                            disabled={feedback !== null}
                            placeholder="Type transformed answer..."
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                            autoFocus
                          />
                        </div>
                      )}

                      {(currentQuestion.type === 'multi-blank' || currentQuestion.type === 'identify') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentQuestion.type === 'multi-blank' 
                              ? 'Enter answers separated by commas (,)' 
                              : 'Label each part (e.g., word1=DAT, word2=AKK)'}
                          </label>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                            disabled={feedback !== null}
                            placeholder={currentQuestion.type === 'multi-blank' 
                              ? "answer1, answer2, answer3..." 
                              : "word=DAT, word=AKK..."}
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Writing Practice Type - Large text area for writing */}
                      {currentQuestion.type === 'writing' && (
                        <div>
                          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="text-sm text-indigo-700 font-medium">
                              ✍️ Writing Practice - Write your response (no auto-grading, self-assess by comparing with sample)
                            </p>
                          </div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Your written response:</label>
                          <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={feedback !== null}
                            placeholder="Write your answer here... (2-3 complete sentences)"
                            rows={6}
                            className="w-full px-6 py-4 border-2 border-indigo-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 font-sans bg-white text-gray-900"
                            autoFocus
                          />
                          <div className="mt-2 text-sm text-gray-600">
                            💡 Tip: Write complete sentences, then compare with the sample answer
                          </div>
                        </div>
                      )}

                      {/* Speaking Practice Type */}
                      {currentQuestion.type === 'speaking' && (
                        <div>
                          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                            <p className="text-sm text-yellow-800">
                              <strong>🗣️ Instructions:</strong>
                            </p>
                            <ol className="list-decimal list-inside text-sm text-yellow-800 mt-2 space-y-1">
                              <li>Read the question aloud</li>
                              <li>Answer in complete German sentences</li>
                              <li>Record yourself if possible (use phone/computer)</li>
                              <li>Type what you said below</li>
                              <li>Compare with the sample answer</li>
                            </ol>
                          </div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type what you said:</label>
                          <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={feedback !== null}
                            placeholder="Type what you said..."
                            rows={4}
                            className="w-full px-6 py-4 border-2 border-indigo-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 font-sans bg-white text-gray-900"
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Reading Comprehension Type */}
                      {currentQuestion.type === 'reading' && (
                        <div>
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                              📖 Answer based on the text above
                            </p>
                          </div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Your answer:</label>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                            disabled={feedback !== null}
                            placeholder="Type your answer..."
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Error Correction Type */}
                      {currentQuestion.type === 'error-correction' && (
                        <div>
                          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-yellow-800">
                              <strong>🔧 Error Correction:</strong> This sentence has one grammatical error. 
                              Find the error and rewrite the ENTIRE sentence correctly.
                            </p>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Original sentence with error:</label>
                            <div className="bg-red-50 p-4 rounded-lg text-xl border-2 border-red-300 text-gray-900 font-medium">
                              {highlightVocabulary(currentQuestion.text, handleWordClick)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type the corrected sentence:</label>
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                              disabled={feedback !== null}
                              placeholder="Rewrite the entire sentence correctly..."
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      {/* Word Order Type */}
                      {currentQuestion.type === 'word-order' && (
                        <div>
                          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800">
                              <strong>🔀 Word Order:</strong> Arrange the words to form a correct German sentence.
                              Remember: Subject-Verb-Time-Manner-Place (TE-KA-MO-LO) or Time-Verb-Subject when time comes first.
                            </p>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Words to arrange:</label>
                            <div className="bg-gray-100 p-4 rounded-lg text-xl border-2 border-gray-300 font-mono text-gray-900 font-medium">
                              {highlightVocabulary(currentQuestion.text, handleWordClick)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type the sentence in correct order:</label>
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                              disabled={feedback !== null}
                              placeholder="Type the complete sentence..."
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      {/* Multiple Choice Type */}
                      {currentQuestion.type === 'choice' && currentQuestion.context && (
                        <div>
                          <div className="mb-6 p-5 bg-white border-2 border-purple-200 rounded-lg">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                              {highlightVocabulary(currentQuestion.text, handleWordClick)}
                            </h4>
                            <p className="text-sm text-purple-700">
                              ☑️ Select the correct answer from the options below
                            </p>
                          </div>
                          <div className="space-y-3">
                            {currentQuestion.context.split(',').map((option, idx) => {
                              const optionText = option.trim();
                              const isSelected = userAnswer === optionText;
                              const isDisabled = feedback !== null;
                              
                              return (
                                <button
                                  key={idx}
                                  onClick={() => !isDisabled && setUserAnswer(optionText)}
                                  disabled={isDisabled}
                                  className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                                    isSelected 
                                      ? 'border-indigo-500 bg-indigo-50' 
                                      : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                                  } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className="flex items-center">
                                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-400'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-lg font-medium ${
                                      isSelected ? 'text-indigo-900' : 'text-gray-900'
                                    }`}>
                                      {highlightVocabulary(optionText, handleWordClick)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Matching Exercise Type */}
                      {currentQuestion.type === 'match' && currentQuestion.context && (
                        <div>
                          <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-green-800">
                              <strong>🔗 Matching Exercise:</strong> Match items by typing pairs (e.g., "item1-match1, item2-match2")
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Column A:</label>
                              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                {currentQuestion.text.split(',').map((item, idx) => (
                                  <div key={idx} className="py-2 text-gray-900 font-medium">
                                    {idx + 1}. {highlightVocabulary(item.trim(), handleWordClick)}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Column B:</label>
                              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                                {currentQuestion.context.split(',').map((item, idx) => (
                                  <div key={idx} className="py-2 text-gray-900 font-medium">
                                    • {highlightVocabulary(item.trim(), handleWordClick)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type your matches (comma-separated pairs):</label>
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                              disabled={feedback !== null}
                              placeholder="item1-match1, item2-match2, item3-match3..."
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      {/* Sentence Building/Order Type */}
                      {currentQuestion.type === 'order' && (
                        <div>
                          <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-indigo-800">
                              <strong>🧩 Sentence Building:</strong> Build a correct German sentence from the words below.
                            </p>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Available words:</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                              {currentQuestion.text.split(/[/,]/).map((word, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-2 bg-white border-2 border-indigo-300 rounded-lg text-gray-900 font-medium shadow-sm"
                                >
                                  {highlightVocabulary(word.trim(), handleWordClick)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type the complete sentence:</label>
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                              disabled={feedback !== null}
                              placeholder="Type the sentence using all words..."
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      {/* Cloze Passage Type */}
                      {currentQuestion.type === 'cloze' && (
                        <div>
                          <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-800">
                              <strong>📄 Cloze Passage:</strong> Fill in the blanks in the text passage.
                              Enter answers separated by commas.
                            </p>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Passage:</label>
                            <div className="bg-white p-5 rounded-lg border-2 border-gray-300">
                              <div className="text-lg leading-relaxed whitespace-pre-wrap text-gray-900">
                                {currentQuestion.text.split(/\{blank\d*\}/).map((part, idx, arr) => (
                                  <span key={idx}>
                                    {highlightVocabulary(part, handleWordClick)}
                                    {idx < arr.length - 1 && (
                                      <span className="inline-block mx-1 px-3 py-1 bg-yellow-100 border-2 border-yellow-400 rounded">
                                        <span className="text-yellow-700 font-semibold">____{idx + 1}____</span>
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Fill in the blanks (comma-separated, in order):
                            </label>
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                              disabled={feedback !== null}
                              placeholder="answer1, answer2, answer3..."
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      {/* Dialogue Practice Type */}
                      {currentQuestion.type === 'dialogue' && currentQuestion.context && (
                        <div>
                          <div className="bg-pink-50 border border-pink-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-pink-800">
                              <strong>💬 Dialogue Practice:</strong> Respond naturally to the conversation.
                              Compare your answer with the sample response.
                            </p>
                          </div>
                          <div className="mb-4 p-5 bg-gray-50 rounded-lg border-2 border-gray-300">
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Situation:</label>
                              <p className="text-gray-900 leading-relaxed">{highlightVocabulary(currentQuestion.context, handleWordClick)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Prompt:</label>
                              <p className="text-indigo-700 font-medium text-lg">{highlightVocabulary(currentQuestion.text, handleWordClick)}</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your response:</label>
                            <textarea
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              disabled={feedback !== null}
                              placeholder="Type your natural response..."
                              rows={4}
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    {feedback && (
                      <div className={`p-6 rounded-lg mb-6 ${
                        feedback.correct ? 'bg-green-50 border-2 border-green-500' : 
                        (currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue') 
                          ? 'bg-blue-50 border-2 border-blue-500' 
                          : 'bg-red-50 border-2 border-red-500'
                      }`}>
                        <div className="flex items-center mb-2">
                          {feedback.correct ? (
                            <Check className="w-6 h-6 text-green-600 mr-2" />
                          ) : (currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue') ? (
                            <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
                          ) : (
                            <X className="w-6 h-6 text-red-600 mr-2" />
                          )}
                          <span className={`text-xl font-bold ${
                            feedback.correct ? 'text-green-700' : 
                            (currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue')
                              ? 'text-blue-700' 
                              : 'text-red-700'
                          }`}>
                            {feedback.correct ? 'Correct!' : 
                             (currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue')
                               ? 'Sample Answer' 
                               : 'Incorrect'}
                          </span>
                        </div>
                        {(currentQuestion.type === 'writing' || currentQuestion.type === 'speaking' || currentQuestion.type === 'dialogue') ? (
                          <div>
                            <p className="text-blue-800 font-medium mb-2">Compare your answer with this sample:</p>
                            <p className="text-blue-900 bg-white p-4 rounded border border-blue-200 whitespace-pre-wrap">
                              {Array.isArray(feedback.correctAnswer) 
                                ? feedback.correctAnswer.join(', ') 
                                : feedback.correctAnswer}
                            </p>
                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <p className="text-sm text-blue-700 font-medium mb-2">Was your answer similar?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Mark as correct for self-assessment
                                    setFeedback({ correct: true, correctAnswer: feedback.correctAnswer });
                                    // Update stats to count as correct
                                    setSessionStats(prev => ({
                                      correct: prev.correct + 1,
                                      total: prev.total
                                    }));
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                >
                                  ✓ Yes, similar enough
                                </button>
                                <button
                                  onClick={() => {
                                    // Keep as needs work
                                  }}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                                >
                                  ✗ Needs more practice
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : !feedback.correct && (
                          <p className="text-red-700">
                            Correct answer: <span className="font-bold">
                              {Array.isArray(feedback.correctAnswer) 
                                ? feedback.correctAnswer.join(', ') 
                                : feedback.correctAnswer}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {!feedback ? (
                        <>
                          <button
                            onClick={checkAnswer}
                            disabled={!userAnswer.trim()}
                            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            Check Answer
                          </button>
                          <button
                            onClick={endSession}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                          >
                            End Session
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={nextQuestion}
                            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
                          >
                            {currentQuestionIndex + 1 < sessionPool.length ? 'Next Question →' : 'Finish Session'}
                          </button>
                          <button
                            onClick={endSession}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                          >
                            End Early
                          </button>
                        </>
                      )}
                    </div>

                    {currentQuestion.timesAnswered > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            This question: {currentQuestion.timesCorrect}/{currentQuestion.timesAnswered} correct
                            ({Math.round((currentQuestion.timesCorrect / currentQuestion.timesAnswered) * 100)}%)
                          </div>
                          <div className="text-xs text-indigo-600">
                            {getMasteryInfo(currentQuestion.timesAnswered, currentQuestion.timesCorrect, currentQuestion.lastReviewed).nextMilestone}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Session Complete View */}
                {view === 'sessionComplete' && (
                  <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                      {sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.8 ? (
                        <div className="text-6xl mb-4">🎉</div>
                      ) : sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.6 ? (
                        <div className="text-6xl mb-4">👍</div>
                      ) : (
                        <div className="text-6xl mb-4">💪</div>
                      )}
                      <h2 className="text-3xl font-bold text-gray-800 mb-2">Session Complete!</h2>
                      <p className="text-gray-600">Great job practicing!</p>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-3xl font-bold text-indigo-600">
                            {sessionStats.correct}
                          </div>
                          <div className="text-sm text-gray-600">Correct</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-gray-600">
                            {sessionStats.total - sessionStats.correct}
                          </div>
                          <div className="text-sm text-gray-600">Incorrect</div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-indigo-200">
                        <div className="text-4xl font-bold text-indigo-600 mb-1">
                          {sessionStats.total > 0 
                            ? Math.round((sessionStats.correct / sessionStats.total) * 100) 
                            : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Accuracy</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={startPractice}
                        className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        Start New Session
                      </button>
                      <button
                        onClick={returnToMenu}
                        className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        Back to Menu
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Add Single Exercise Modal */}
        {showAddExerciseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Single Exercise</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste your exercise in the format below. The parser will automatically extract the title, description, and questions.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-xs font-mono">
                  <div className="text-gray-700 mb-2"><strong>Format Example:</strong></div>
                  <pre className="whitespace-pre-wrap text-gray-600">
{`title: Transform to Plural Dative

description ->
Transform singular nouns with articles to plural dative form.

**The -n Rule:**
- In dative plural, add **-n** to the noun
- Article: Always **den**

questions ->
das Kind >> den Kindern
die Studentin >> den Studentinnen
der Nachbar >> den Nachbarn`}
                  </pre>
                </div>

                <textarea
                  value={singleExerciseText}
                  onChange={(e) => setSingleExerciseText(e.target.value)}
                  placeholder="Paste exercise text here..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md font-mono text-sm bg-white text-gray-900 mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddExerciseModal(false);
                      setSingleExerciseText('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSingleExerciseFromText}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Parse & Add Exercise
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Bulk Exercises Modal */}
        {showBulkExerciseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Multiple Exercises</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste multiple exercises using the <code className="bg-gray-200 px-2 py-1 rounded">---EXERCISE---</code> delimiter format.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-xs font-mono">
                  <div className="text-gray-700 mb-2"><strong>Format Example:</strong></div>
                  <pre className="whitespace-pre-wrap text-gray-600">
{`---EXERCISE---
title: Exercise 1 Title
description: |
  Multi-line description here.
  Supports **markdown** formatting.

questions:
Question 1 | Answer 1
Question 2 | Answer 2
---END---

---EXERCISE---
title: Exercise 2 Title
description: |
  Another exercise description.

questions:
das Kind >> den Kindern
die Frau >> den Frauen
---END---`}
                  </pre>
                </div>

                <textarea
                  value={bulkExercisesText}
                  onChange={(e) => setBulkExercisesText(e.target.value)}
                  placeholder="Paste multiple exercises here..."
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md font-mono text-sm bg-white text-gray-900 mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBulkExerciseModal(false);
                      setBulkExercisesText('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBulkExercisesFromText}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Parse & Add All Exercises
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vocabulary Modal - Shows word details when clicked */}
        {showVocabModal && selectedWord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">{selectedWord.word}</h3>
                  <button
                    onClick={() => setShowVocabModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Meaning:</h4>
                    <p className="text-lg text-gray-900">{selectedWord.meaning}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Forms:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedWord.forms.map((form, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200"
                        >
                          {form}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowVocabModal(false)}
                  className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Single Vocabulary Modal */}
        {showAddVocabModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Vocabulary Word</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Word <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={singleVocabWord}
                      onChange={(e) => setSingleVocabWord(e.target.value)}
                      placeholder="e.g., lesen"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Forms (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={singleVocabForms}
                      onChange={(e) => setSingleVocabForms(e.target.value)}
                      placeholder="e.g., lesen, liest, las, gelesen"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      All verb forms, articles, plurals, etc.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meaning <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={singleVocabMeaning}
                      onChange={(e) => setSingleVocabMeaning(e.target.value)}
                      placeholder="e.g., to read"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddVocabModal(false);
                      setSingleVocabWord('');
                      setSingleVocabForms('');
                      setSingleVocabMeaning('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSingleVocab}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Bulk Vocabulary Modal */}
        {showBulkVocabModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Bulk Import Vocabulary</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste your vocabulary JSON below. The format should include a "vocabulary" array.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-xs font-mono">
                  <div className="text-gray-700 mb-2"><strong>Format Example:</strong></div>
                  <pre className="whitespace-pre-wrap text-gray-600">
{`{
  "vocabulary": [
    {
      "word": "lesen",
      "forms": ["lesen", "liest", "las", "gelesen"],
      "meaning": "to read"
    },
    {
      "word": "Fahrrad",
      "forms": ["das Fahrrad", "Fahrräder"],
      "meaning": "bicycle"
    }
  ]
}`}
                  </pre>
                </div>

                <textarea
                  value={bulkVocabText}
                  onChange={(e) => setBulkVocabText(e.target.value)}
                  placeholder="Paste JSON here..."
                  rows={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md font-mono text-sm bg-white text-gray-900 mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBulkVocabModal(false);
                      setBulkVocabText('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBulkVocab}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Import Vocabulary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;