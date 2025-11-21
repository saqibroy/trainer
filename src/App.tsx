import React, { useState, useEffect } from 'react';
import { Trash2, Plus, BookOpen, Target, Edit2, Check, X, Clock, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MatchQuestion from './components/MatchQuestion';
import OrderQuestion from './components/OrderQuestion';
import ClozeQuestion from './components/ClozeQuestion';

const STORAGE_KEY = 'german-practice-data';
const APP_VERSION = '2.0.0'; // Increment this when making breaking changes
const VERSION_KEY = 'app-version';

// Question interface with all required fields
interface Question {
  id: string;
  type: 'fill-blank' | 'transform' | 'multi-blank' | 'identify' | 'writing' | 'speaking' | 'reading' | 'error-correction' | 'word-order' | 'choice' | 'match' | 'order' | 'cloze' | 'dialogue' | 'conversation';
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

// Vocabulary interface with SRS tracking
interface VocabularyItem {
  id: string;
  word: string;
  forms: string[];
  meaning: string;
  createdAt: string;
  topicId?: string; // Link to topic for vocabulary practice
  timesAnswered: number; // Track flashcard practice
  timesCorrect: number; // Track correct answers
  lastReviewed: string | null; // Last practice date
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
  },
  'conversation': {
    label: 'Interactive Conversation',
    icon: '🗨️',
    description: 'Multi-turn conversation with fill-in-the-blanks',
    autoGrade: true
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

// Calculate minutes since last review
const getMinutesSinceLastReview = (lastReviewed: string | null): number => {
  if (!lastReviewed) return Infinity;
  const now = new Date();
  const last = new Date(lastReviewed);
  const diffTime = Math.abs(now.getTime() - last.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  return diffMinutes;
};

// Get review interval based on mastery level and attempts (in minutes)
const getReviewInterval = (level: 'new' | 'weak' | 'middle' | 'mastered', timesAnswered: number): number => {
  if (level === 'new' || level === 'weak') {
    return 0; // Always show immediately
  }
  
  if (level === 'middle') {
    // Learning state - progressive intervals based on attempts
    if (timesAnswered < 4) return 1; // 1 minute (show in same session)
    if (timesAnswered < 6) return 10; // 10 minutes
    if (timesAnswered < 8) return 60; // 1 hour
    return 240; // 4 hours before becoming mastered
  }
  
  if (level === 'mastered') {
    return 10080; // 7 days in minutes (show weekly)
  }
  
  return 0;
};

// Check if question is due for review
const isDueForReview = (timesAnswered: number, timesCorrect: number, lastReviewed: string | null): boolean => {
  const level = getMasteryLevel(timesAnswered, timesCorrect);
  const minutesSince = getMinutesSinceLastReview(lastReviewed);
  const interval = getReviewInterval(level, timesAnswered);
  return minutesSince >= interval;
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
  const [conversationTurnIndex, setConversationTurnIndex] = useState(0); // Track current turn in conversation
  const [conversationAnswers, setConversationAnswers] = useState<string[]>([]); // Store answers for each turn
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string | string[] } | null>(null);
  const [sessionPool, setSessionPool] = useState<Question[]>([]);
  const [sessionSize, setSessionSize] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [matchCheckedItems, setMatchCheckedItems] = useState<Set<number>>(new Set()); // For match question categorization mode

  // Vocabulary states
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [showAddVocabModal, setShowAddVocabModal] = useState(false);
  const [singleVocabWord, setSingleVocabWord] = useState('');
  const [singleVocabForms, setSingleVocabForms] = useState('');
  const [singleVocabMeaning, setSingleVocabMeaning] = useState('');

  // Flashcard practice states
  const [flashcardView, setFlashcardView] = useState<'menu' | 'practice' | 'sessionComplete'>('menu');
  const [flashcardPool, setFlashcardPool] = useState<VocabularyItem[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [flashcardSessionSize, setFlashcardSessionSize] = useState(10);
  const [flashcardSessionStats, setFlashcardSessionStats] = useState({ correct: 0, total: 0 });

  // Load data from localStorage with migration support
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      // Check version compatibility
      if (storedVersion && storedVersion !== APP_VERSION) {
        console.log(`App updated from ${storedVersion} to ${APP_VERSION}`);
      }
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          // Validate and migrate data structure
          let loadedTopics: Topic[] = [];
          let loadedVocabulary: VocabularyItem[] = [];
          
          // Handle topics
          if (data.topics && Array.isArray(data.topics)) {
            // Validate each topic has required fields
            loadedTopics = data.topics.map((topic: any) => {
              // Ensure topic has all required fields
              return {
                id: topic.id || `topic-${Date.now()}-${Math.random()}`,
                title: topic.title || 'Untitled Topic',
                description: topic.description,
                createdAt: topic.createdAt || new Date().toISOString(),
                exercises: Array.isArray(topic.exercises) ? topic.exercises.map((ex: any) => {
                  // Ensure exercise has required fields
                  return {
                    id: ex.id || `ex-${Date.now()}-${Math.random()}`,
                    name: ex.name || 'Untitled Exercise',
                    description: ex.description,
                    instructions: ex.instructions,
                    questions: Array.isArray(ex.questions) ? ex.questions.map((q: any) => {
                      // Ensure question has required fields
                      return {
                        id: q.id || `q-${Date.now()}-${Math.random()}`,
                        type: q.type || 'fill-blank',
                        text: q.text || '',
                        answer: q.answer || '',
                        context: q.context,
                        timesAnswered: q.timesAnswered || 0,
                        timesCorrect: q.timesCorrect || 0,
                        lastReviewed: q.lastReviewed || null,
                        createdAt: q.createdAt || new Date().toISOString()
                      };
                    }) : []
                  };
                }) : []
              };
            });
          } else if (data.exercises) {
            // Migrate old format to topics
            const migratedTopics = migrateToTopics(data.exercises);
            loadedTopics = migratedTopics;
            if (migratedTopics.length > 0) {
              setSelectedTopicId(migratedTopics[0].id);
            }
          }
          
          // Handle vocabulary (safe check with validation)
          if (data.vocabulary && Array.isArray(data.vocabulary)) {
            loadedVocabulary = data.vocabulary.map((vocab: any) => {
              return {
                id: vocab.id || `vocab-${Date.now()}-${Math.random()}`,
                word: vocab.word || '',
                forms: Array.isArray(vocab.forms) ? vocab.forms : [vocab.word || ''],
                meaning: vocab.meaning || '',
                topicId: vocab.topicId || undefined,
                timesAnswered: vocab.timesAnswered || 0,
                timesCorrect: vocab.timesCorrect || 0,
                lastReviewed: vocab.lastReviewed || null,
                createdAt: vocab.createdAt || new Date().toISOString()
              };
            });
          }
          
          // Set the validated data
          setTopics(loadedTopics);
          setVocabulary(loadedVocabulary);
          
          // Update version after successful load
          localStorage.setItem(VERSION_KEY, APP_VERSION);
          
          console.log(`Loaded ${loadedTopics.length} topics and ${loadedVocabulary.length} vocabulary items`);
        } catch (parseError) {
          console.error('Failed to parse stored data:', parseError);
          
          // Try to backup the corrupted data
          const backupKey = `${STORAGE_KEY}-backup-${Date.now()}`;
          localStorage.setItem(backupKey, stored);
          
          // Alert user with recovery option
          const recover = confirm(
            'There was an issue loading your data. Your data has been backed up.\n\n' +
            'Click OK to start fresh (your old data is saved as backup).\n' +
            'Click Cancel to try exporting your data first.'
          );
          
          if (!recover) {
            // Give user a chance to export
            alert('Please use the Export button to save your data, then refresh the page.');
          } else {
            // Clear storage and start fresh
            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(VERSION_KEY, APP_VERSION);
          }
        }
      } else {
        // First time user, set version
        localStorage.setItem(VERSION_KEY, APP_VERSION);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      alert('Could not access browser storage. Some features may not work correctly.');
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      if (topics.length > 0 || vocabulary.length > 0) {
        const dataToSave = { topics, vocabulary };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        localStorage.setItem(VERSION_KEY, APP_VERSION);
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Storage might be full or disabled
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
    if (!bulkExercisesText.trim()) return;
    
    try {
      // Try parsing as JSON first
      const jsonData = JSON.parse(bulkExercisesText);
      addBulkFromJSON(jsonData);
      return;
    } catch {
      // Not JSON, fallback to text format
      if (!selectedTopicId) {
        alert('Please select a topic first, or use JSON format with topic metadata.');
        return;
      }
      
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
    }
  };

  // Add bulk exercises from JSON format with optional topic creation
  const addBulkFromJSON = (jsonData: any) => {
    try {
      let targetTopicId = selectedTopicId;
      let topicCreated = false;
      let newTopicToCreate: Topic | null = null;
      
      // Check if JSON includes topic metadata
      if (jsonData.topic && jsonData.topic.title) {
        // Create or find topic
        const existingTopic = topics.find(t => 
          t.title.toLowerCase() === jsonData.topic.title.toLowerCase()
        );
        
        if (existingTopic) {
          targetTopicId = existingTopic.id;
        } else {
          // Prepare new topic (will be added with exercises in single update)
          targetTopicId = `topic-${Date.now()}`;
          newTopicToCreate = {
            id: targetTopicId,
            title: jsonData.topic.title,
            description: jsonData.topic.description || undefined,
            createdAt: new Date().toISOString(),
            exercises: []
          };
          topicCreated = true;
        }
      }
      
      if (!targetTopicId) {
        alert('Please select a topic or include topic metadata in JSON.');
        return;
      }
      
      // Parse exercises from JSON
      const exercisesData = jsonData.exercises || [];
      if (!Array.isArray(exercisesData) || exercisesData.length === 0) {
        alert('No exercises found in JSON. Expected "exercises" array.');
        return;
      }
      
      const newExercises: Exercise[] = exercisesData.map((exData: any, exIndex: number) => {
        const newQuestions: Question[] = (exData.questions || []).map((qData: any, qIndex: number) => {
          // Handle both simplified JSON format and full format
          let questionData: Partial<Question>;
          
          if (typeof qData === 'string') {
            // Text format in JSON - parse it
            const parsed = parseQuestion(qData);
            if (!parsed) return null;
            questionData = parsed;
          } else {
            // Full JSON format
            questionData = {
              type: qData.type || 'fill-blank',
              text: qData.text || qData.question || '',
              answer: qData.answer || '',
              context: qData.context || qData.options?.join(', ') || undefined
            };
          }
          
          return {
            id: `${Date.now()}-ex${exIndex}-q${qIndex}-${Math.random()}`,
            type: questionData.type!,
            text: questionData.text!,
            answer: questionData.answer!,
            context: questionData.context,
            timesAnswered: 0,
            timesCorrect: 0,
            lastReviewed: null,
            createdAt: new Date().toISOString()
          };
        }).filter((q: Question | null): q is Question => q !== null);
        
        return {
          id: `exercise-${Date.now()}-${exIndex}`,
          name: exData.name || exData.title || `Exercise ${exIndex + 1}`,
          description: exData.description || undefined,
          questions: newQuestions
        };
      });
      
      // Update topics: either add new topic with exercises OR add exercises to existing topic
      if (newTopicToCreate) {
        // Add new topic with exercises in single update
        setTopics(prev => [...prev, { ...newTopicToCreate!, exercises: newExercises }]);
      } else {
        // Add exercises to existing topic
        updateTopics(topics => topics.map(t => 
          t.id === targetTopicId
            ? { ...t, exercises: [...t.exercises, ...newExercises] }
            : t
        ));
      }
      
      // Import vocabulary if included in JSON
      if (jsonData.vocabulary && Array.isArray(jsonData.vocabulary)) {
        const newVocab: VocabularyItem[] = jsonData.vocabulary.map((item: any, index: number) => ({
          id: `vocab-${Date.now()}-${index}`,
          word: item.word,
          forms: item.forms || [item.word],
          meaning: item.meaning,
          topicId: targetTopicId,
          timesAnswered: item.timesAnswered || 0,
          timesCorrect: item.timesCorrect || 0,
          lastReviewed: item.lastReviewed || null,
          createdAt: new Date().toISOString()
        }));
        
        setVocabulary(prev => [...prev, ...newVocab]);
      }
      
      // Select the topic if new
      if (topicCreated) {
        setSelectedTopicId(targetTopicId);
      }
      
      setBulkExercisesText('');
      setShowBulkExerciseModal(false);
      
      const vocabCount = jsonData.vocabulary?.length || 0;
      const message = topicCreated 
        ? `Created topic and added ${newExercises.length} exercises${vocabCount > 0 ? ` + ${vocabCount} vocabulary words` : ''}!`
        : `Successfully added ${newExercises.length} exercises${vocabCount > 0 ? ` + ${vocabCount} vocabulary words` : ''}!`;
      alert(message);
      
    } catch (error) {
      console.error('JSON parse error:', error);
      alert('Error parsing JSON. Please check the format:\n\n' + 
            'Expected structure:\n' +
            '{\n' +
            '  "topic": {"title": "Topic Name", "description": "..."},\n' +
            '  "exercises": [{name: "Ex1", questions: [...]}],\n' +
            '  "vocabulary": [{word: "...", forms: [...], meaning: "..."}]\n' +
            '}');
    }
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

    // FALLBACK: If no questions are due (all Learning but not due yet), 
    // still show Learning questions to keep practice active
    if (pool.length === 0) {
      const allMiddle = questions.filter(q => getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'middle');
      if (allMiddle.length > 0) {
        addFromCategory(allMiddle, Math.min(size, allMiddle.length));
      } else {
        // If no Learning questions, show any available questions
        addFromCategory(questions, Math.min(size, questions.length));
      }
    }

    // Shuffle the pool to randomize order within the session
    return pool.sort(() => Math.random() - 0.5);
  };

  // Create flashcard session pool using SRS algorithm
  const createFlashcardPool = (vocabItems: VocabularyItem[], size: number): VocabularyItem[] => {
    // Filter vocabulary that is due for review
    const dueVocab = vocabItems.filter(v => isDueForReview(v.timesAnswered, v.timesCorrect, v.lastReviewed));
    
    // Group by mastery level
    const newV = dueVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'new');
    const weak = dueVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'weak');
    const middle = dueVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'middle');
    const mastered = dueVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'mastered');

    const pool: VocabularyItem[] = [];
    const usedIds = new Set<string>();

    const addFromCategory = (category: VocabularyItem[], maxCount: number): number => {
      const available = category.filter(v => !usedIds.has(v.id));
      const toAdd = Math.min(maxCount, available.length);
      
      for (let i = 0; i < toAdd; i++) {
        if (available.length === 0) break;
        const randomIndex = Math.floor(Math.random() * available.length);
        const item = available[randomIndex];
        pool.push(item);
        usedIds.add(item.id);
        available.splice(randomIndex, 1);
      }
      
      return toAdd;
    };

    // Priority: New > Weak > Learning > Mastered
    let remaining = size;
    
    if (remaining > 0 && newV.length > 0) {
      remaining -= addFromCategory(newV, remaining);
    }
    
    if (remaining > 0 && weak.length > 0) {
      remaining -= addFromCategory(weak, remaining);
    }
    
    if (remaining > 0 && middle.length > 0) {
      remaining -= addFromCategory(middle, remaining);
    }
    
    if (remaining > 0 && mastered.length > 0) {
      remaining -= addFromCategory(mastered, remaining);
    }

    // FALLBACK: If no vocabulary is due, still show Learning items
    if (pool.length === 0) {
      const allMiddle = vocabItems.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'middle');
      if (allMiddle.length > 0) {
        addFromCategory(allMiddle, Math.min(size, allMiddle.length));
      } else {
        // If no Learning items, show any available
        addFromCategory(vocabItems, Math.min(size, vocabItems.length));
      }
    }

    // Shuffle
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
      topicId: selectedTopicId || undefined,
      timesAnswered: 0,
      timesCorrect: 0,
      lastReviewed: null,
      createdAt: new Date().toISOString()
    };
    
    setVocabulary([...vocabulary, newVocab]);
    setSingleVocabWord('');
    setSingleVocabForms('');
    setSingleVocabMeaning('');
    setShowAddVocabModal(false);
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

    // Filter vocabulary by current topic when in practice mode
    const relevantVocabulary = view === 'practice' && selectedTopicId
      ? vocabulary.filter(v => v.topicId === selectedTopicId || !v.topicId) // Include topic vocab + legacy vocab without topicId
      : vocabulary; // Use all vocabulary in other views

    // Create a map of all forms to their vocabulary items
    const formToVocab = new Map<string, VocabularyItem>();
    relevantVocabulary.forEach(vocab => {
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
    setConversationTurnIndex(0);
    setConversationAnswers([]);
    setMatchCheckedItems(new Set());
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
    setConversationTurnIndex(0);
    setConversationAnswers([]);
    setMatchCheckedItems(new Set());
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
    setConversationTurnIndex(0);
    setConversationAnswers([]);
    setMatchCheckedItems(new Set());
    setFeedback(null);
  };

  // ========== FLASHCARD PRACTICE FUNCTIONS ==========

  const startFlashcardPractice = () => {
    if (!selectedTopicId) return;
    
    // Get vocabulary for this topic
    const topicVocab = vocabulary.filter(v => v.topicId === selectedTopicId);
    
    if (topicVocab.length === 0) {
      alert('No vocabulary found for this topic. Add some vocabulary first!');
      return;
    }

    // Create session pool using SRS
    const pool = createFlashcardPool(topicVocab, Math.min(flashcardSessionSize, topicVocab.length));
    
    if (pool.length === 0) {
      alert('No vocabulary is due for review right now. Come back later!');
      return;
    }

    setFlashcardPool(pool);
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
    setFlashcardSessionStats({ correct: 0, total: 0 });
    setFlashcardView('practice');
  };

  const flipFlashcard = () => {
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  const handleFlashcardResponse = (wasCorrect: boolean) => {
    if (!selectedTopicId || flashcardPool.length === 0) return;
    
    const currentCard = flashcardPool[currentFlashcardIndex];
    
    // Update vocabulary stats
    setVocabulary(vocab => vocab.map(v =>
      v.id === currentCard.id
        ? {
            ...v,
            timesAnswered: v.timesAnswered + 1,
            timesCorrect: v.timesCorrect + (wasCorrect ? 1 : 0),
            lastReviewed: new Date().toISOString()
          }
        : v
    ));

    // Update session stats
    setFlashcardSessionStats(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    // Move to next card or end session
    if (currentFlashcardIndex + 1 >= flashcardPool.length) {
      setFlashcardView('sessionComplete');
    } else {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setIsFlashcardFlipped(false);
    }
  };

  const returnToTopicMenu = () => {
    setFlashcardView('menu');
    setFlashcardPool([]);
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
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
    const minutesSince = getMinutesSinceLastReview(lastReviewed);
    const reviewInterval = getReviewInterval(level, timesAnswered);
    const isDue = isDueForReview(timesAnswered, timesCorrect, lastReviewed);
    
    // Convert minutes to days for display
    const daysSince = minutesSince >= 1440 ? Math.floor(minutesSince / 1440) : 0;
    
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
      
      // Format review status for learning (minutes/hours)
      if (isDue) {
        reviewStatus = 'Due now';
      } else {
        const remainingMinutes = reviewInterval - minutesSince;
        if (remainingMinutes < 60) {
          reviewStatus = `Review in ${remainingMinutes} min`;
        } else if (remainingMinutes < 1440) {
          const hours = Math.floor(remainingMinutes / 60);
          reviewStatus = `Review in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          const days = Math.floor(remainingMinutes / 1440);
          reviewStatus = `Review in ${days} day${days > 1 ? 's' : ''}`;
        }
      }
    } else {
      nextMilestone = 'Mastered! Keep reviewing.';
      if (isDue) {
        reviewStatus = 'Due for review';
      } else {
        const remainingDays = Math.floor((reviewInterval - minutesSince) / 1440);
        reviewStatus = remainingDays > 0 ? `Review in ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : 'Review soon';
      }
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

              {/* Create Topic Button - Always Available */}
              <div className="mb-4 pb-4 border-b">
                <button
                  onClick={() => setShowBulkExerciseModal(true)}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  📚 Create Topic
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Import exercises + vocabulary from AI-generated JSON
                </p>
              </div>

              {/* Manual Topic Creation (Optional) */}
              <div className="mb-4 pb-4 border-b">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between hover:text-gray-900">
                    <span>Or Create Empty Topic</span>
                    <span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                  </summary>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="New topic (e.g., telc B1 Dative)"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && createTopic()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                    />
                    <textarea
                      placeholder="Topic description (optional)"
                      value={newTopicDescription}
                      onChange={(e) => setNewTopicDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none bg-white text-gray-900"
                    />
                    <button
                      onClick={createTopic}
                      className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Empty Topic
                    </button>
                  </div>
                </details>
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
                    📚 Create Topic
                  </button>
                  
                  {/* Vocabulary Session Size Control */}
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Flashcard Session Size
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={flashcardSessionSize}
                      onChange={(e) => setFlashcardSessionSize(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of vocabulary cards per session (5-50)
                    </p>
                  </div>
                  
                  {/* Vocabulary Practice Button */}
                  <button
                    onClick={() => {
                      const topicVocab = vocabulary.filter(v => v.topicId === selectedTopicId);
                      if (topicVocab.length === 0) {
                        alert('No vocabulary for this topic yet. Add vocabulary words first!');
                      } else {
                        startFlashcardPractice();
                        setMobileView('content');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 rounded-md text-sm hover:from-purple-700 hover:to-pink-700 flex items-center justify-center font-semibold"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    📚 Practice Vocabulary
                  </button>
                </div>

                {/* Topic Vocabulary Section */}
                {(() => {
                  const topicVocab = vocabulary.filter(v => v.topicId === selectedTopicId);
                  
                  // Calculate vocabulary stats
                  const vocabStats = {
                    total: topicVocab.length,
                    mastered: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'mastered').length,
                    learning: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'middle').length,
                    weak: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'weak').length,
                    new: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'new').length,
                    dueCount: topicVocab.filter(v => {
                      const info = getMasteryInfo(v.timesAnswered, v.timesCorrect, v.lastReviewed);
                      return info.isDue;
                    }).length,
                    correctRate: topicVocab.length > 0 && topicVocab.some(v => v.timesAnswered > 0)
                      ? Math.round((topicVocab.reduce((sum, v) => sum + v.timesCorrect, 0) / topicVocab.reduce((sum, v) => sum + v.timesAnswered, 0)) * 100)
                      : 0
                  };

                  return (
                    <div className="mb-4 pb-4 border-b">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        📚 Topic Vocabulary ({topicVocab.length})
                      </h3>

                      {/* Vocabulary Stats */}
                      {topicVocab.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-3 mb-2">
                          <div className="grid grid-cols-5 gap-1 mb-2">
                            <div className="text-center">
                              <div className="text-xs font-bold text-green-600">{vocabStats.mastered}</div>
                              <div className="text-xs text-gray-600">✓</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-yellow-600">{vocabStats.learning}</div>
                              <div className="text-xs text-gray-600">📚</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-red-600">{vocabStats.weak}</div>
                              <div className="text-xs text-gray-600">⚠️</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-gray-600">{vocabStats.new}</div>
                              <div className="text-xs text-gray-600">🆕</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-orange-600">{vocabStats.dueCount}</div>
                              <div className="text-xs text-gray-600">⏰</div>
                            </div>
                          </div>
                          {vocabStats.correctRate > 0 && (
                            <div className="text-center text-xs">
                              <span className="font-semibold text-purple-600">{vocabStats.correctRate}%</span>
                              <span className="text-gray-600"> accuracy</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <button
                          onClick={() => setShowAddVocabModal(true)}
                          className="w-full bg-teal-600 text-white px-3 py-2 rounded-md text-sm hover:bg-teal-700 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Word
                        </button>
                        {topicVocab.length > 0 && (
                          <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-2 space-y-1">
                            {topicVocab.map(vocab => {
                              const masteryLevel = getMasteryLevel(vocab.timesAnswered, vocab.timesCorrect);
                              const masteryInfo = getMasteryInfo(vocab.timesAnswered, vocab.timesCorrect, vocab.lastReviewed);
                              return (
                                <div key={vocab.id} className="flex items-center justify-between text-xs bg-white rounded p-1.5 border border-gray-200">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-700 font-medium truncate">{vocab.word}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${getMasteryColor(masteryLevel)}`}>
                                        {masteryLevel === 'mastered' ? '✓' : masteryLevel === 'middle' ? '📚' : masteryLevel === 'weak' ? '⚠️' : '🆕'}
                                      </span>
                                    </div>
                                    <span className="text-gray-500 text-xs block truncate">{vocab.meaning}</span>
                                    {vocab.timesAnswered > 0 && (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500">
                                          {vocab.timesCorrect}/{vocab.timesAnswered}
                                        </span>
                                        {masteryInfo.isDue && (
                                          <span className="text-xs text-orange-600">⏰ Due</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteVocab(vocab.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                                    title="Delete vocabulary"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
            {/* Flashcard Practice View - Show independently of selected exercise */}
            {flashcardView === 'practice' && flashcardPool.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                {/* Header with enhanced progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold text-gray-800">📚 Vocabulary Practice</h2>
                    <button
                      onClick={returnToTopicMenu}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      End Session
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Card <span className="font-semibold">{currentFlashcardIndex + 1}</span> of {flashcardPool.length}
                      </span>
                      <span className="text-gray-600">
                        Session: <span className="font-semibold text-green-600">{flashcardSessionStats.correct}</span> / 
                        <span className="font-semibold text-red-600">{flashcardSessionStats.total - flashcardSessionStats.correct}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${((currentFlashcardIndex + 1) / flashcardPool.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Current word mastery badge */}
                  {(() => {
                    const card = flashcardPool[currentFlashcardIndex];
                    const masteryLevel = getMasteryLevel(card.timesAnswered, card.timesCorrect);
                    const masteryInfo = getMasteryInfo(card.timesAnswered, card.timesCorrect, card.lastReviewed);
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getMasteryColor(masteryLevel)}`}>
                          {masteryLevel === 'mastered' ? '⭐ Mastered' : 
                           masteryLevel === 'middle' ? '📚 Learning' : 
                           masteryLevel === 'weak' ? '⚠️ Weak' : '🆕 New'}
                        </span>
                        {card.timesAnswered > 0 && (
                          <span className="text-xs text-gray-600">
                            {card.timesCorrect}/{card.timesAnswered} correct 
                            ({Math.round((card.timesCorrect / card.timesAnswered) * 100)}%)
                          </span>
                        )}
                        {masteryInfo.isDue && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Due for review
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Flashcard */}
                <div className="mb-6">
                  <div 
                    className="relative w-full h-80 sm:h-96 cursor-pointer perspective-1000"
                    onClick={isFlashcardFlipped ? undefined : flipFlashcard}
                    style={{ perspective: '1000px' }}
                  >
                    <div 
                      className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                        isFlashcardFlipped ? 'rotate-y-180' : ''
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Front of card - Word */}
                      <div 
                        className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <div className="text-white text-center">
                          <div className="text-sm font-semibold mb-4 opacity-80">GERMAN WORD</div>
                          <div className="text-4xl sm:text-5xl font-bold mb-6">
                            {flashcardPool[currentFlashcardIndex].word}
                          </div>
                          {flashcardPool[currentFlashcardIndex].forms.length > 1 && (
                            <div className="text-lg opacity-90 space-y-1">
                              <div className="text-sm font-semibold mb-2">Forms:</div>
                              {flashcardPool[currentFlashcardIndex].forms.map((form, idx) => (
                                <div key={idx}>{form}</div>
                              ))}
                            </div>
                          )}
                          <div className="mt-8 text-sm opacity-70">
                            {!isFlashcardFlipped && '👆 Click to reveal meaning'}
                          </div>
                        </div>
                      </div>

                      {/* Back of card - Meaning */}
                      <div 
                        className="absolute w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-2xl flex items-center justify-center p-8"
                        style={{ 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <div className="text-white text-center">
                          <div className="text-sm font-semibold mb-4 opacity-80">MEANING</div>
                          <div className="text-3xl sm:text-4xl font-bold">
                            {flashcardPool[currentFlashcardIndex].meaning}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Self-assessment buttons with enhanced UI */}
                {isFlashcardFlipped ? (
                  <div className="space-y-3">
                    <div className="text-center text-sm font-medium text-gray-600 mb-2">
                      Did you remember this word correctly?
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleFlashcardResponse(false)}
                        className="group relative bg-gradient-to-br from-red-500 to-red-600 text-white px-6 py-5 rounded-xl hover:from-red-600 hover:to-red-700 font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-1">❌</div>
                          <div>I Forgot</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFlashcardResponse(true)}
                        className="group relative bg-gradient-to-br from-green-500 to-green-600 text-white px-6 py-5 rounded-xl hover:from-green-600 hover:to-green-700 font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-1">✅</div>
                          <div>I Remembered</div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={flipFlashcard}
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-600 hover:to-purple-700 font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">🔄</span>
                        <span>Flip Card</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Enhanced stats with milestone progress */}
                {flashcardPool[currentFlashcardIndex].timesAnswered > 0 && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                    <div className="text-center">
                      <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                        Word Performance
                      </div>
                      <div className="text-lg font-bold text-gray-800 mb-1">
                        {flashcardPool[currentFlashcardIndex].timesCorrect}/{flashcardPool[currentFlashcardIndex].timesAnswered} correct
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          ({Math.round((flashcardPool[currentFlashcardIndex].timesCorrect / flashcardPool[currentFlashcardIndex].timesAnswered) * 100)}%)
                        </span>
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {getMasteryInfo(
                          flashcardPool[currentFlashcardIndex].timesAnswered, 
                          flashcardPool[currentFlashcardIndex].timesCorrect, 
                          flashcardPool[currentFlashcardIndex].lastReviewed
                        ).nextMilestone}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : flashcardView === 'sessionComplete' ? (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-6">
                  {flashcardSessionStats.total > 0 && flashcardSessionStats.correct / flashcardSessionStats.total >= 0.8 ? (
                    <div className="text-7xl mb-4 animate-bounce">🎉</div>
                  ) : flashcardSessionStats.total > 0 && flashcardSessionStats.correct / flashcardSessionStats.total >= 0.6 ? (
                    <div className="text-7xl mb-4">👍</div>
                  ) : (
                    <div className="text-7xl mb-4">💪</div>
                  )}
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Vocabulary Practice Complete!</h2>
                  <p className="text-gray-600">Great job practicing your vocabulary!</p>
                </div>

                {/* Enhanced statistics */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-200">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600">
                        {flashcardSessionStats.correct}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">✅ Remembered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600">
                        {flashcardSessionStats.total - flashcardSessionStats.correct}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">❌ Forgot</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-indigo-600">
                        {flashcardSessionStats.total}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">📚 Total</div>
                    </div>
                  </div>
                  
                  {/* Accuracy bar */}
                  <div className="pt-5 border-t border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Session Accuracy</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {flashcardSessionStats.total > 0 
                          ? Math.round((flashcardSessionStats.correct / flashcardSessionStats.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ 
                          width: `${flashcardSessionStats.total > 0 
                            ? Math.round((flashcardSessionStats.correct / flashcardSessionStats.total) * 100) 
                            : 0}%` 
                        }}
                      >
                        {flashcardSessionStats.total > 0 && 
                         flashcardSessionStats.correct / flashcardSessionStats.total >= 0.15 && (
                          <span className="text-xs text-white font-bold">
                            {Math.round((flashcardSessionStats.correct / flashcardSessionStats.total) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mastery breakdown */}
                {(() => {
                  const topicVocab = vocabulary.filter(v => v.topicId === selectedTopicId);
                  const masteryBreakdown = {
                    mastered: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'mastered').length,
                    learning: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'middle').length,
                    weak: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'weak').length,
                    new: topicVocab.filter(v => getMasteryLevel(v.timesAnswered, v.timesCorrect) === 'new').length,
                  };
                  return (
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Overall Vocabulary Progress</h3>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-green-100 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-700">{masteryBreakdown.mastered}</div>
                          <div className="text-xs text-green-600 mt-1">⭐ Mastered</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                          <div className="text-2xl font-bold text-yellow-700">{masteryBreakdown.learning}</div>
                          <div className="text-xs text-yellow-600 mt-1">📚 Learning</div>
                        </div>
                        <div className="text-center p-3 bg-red-100 rounded-lg border border-red-200">
                          <div className="text-2xl font-bold text-red-700">{masteryBreakdown.weak}</div>
                          <div className="text-xs text-red-600 mt-1">⚠️ Weak</div>
                        </div>
                        <div className="text-center p-3 bg-gray-200 rounded-lg border border-gray-300">
                          <div className="text-2xl font-bold text-gray-700">{masteryBreakdown.new}</div>
                          <div className="text-xs text-gray-600 mt-1">🆕 New</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={startFlashcardPractice}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>🔄</span>
                      <span>Practice Again</span>
                    </div>
                  </button>
                  <button
                    onClick={returnToTopicMenu}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 font-semibold text-lg transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>👈</span>
                      <span>Back to Menu</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : !selectedExercise ? (
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
                    {!['error-correction', 'word-order', 'choice', 'match', 'order', 'cloze', 'dialogue', 'conversation', 'identify', 'reading'].includes(currentQuestion.type) && (
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

                      {currentQuestion.type === 'multi-blank' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter answers separated by commas (,)
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
                      )}

                      {currentQuestion.type === 'identify' && currentQuestion.context && (() => {
                        // Parse context to understand what needs to be identified
                        // This type is flexible for any subject (reading, grammar, vocabulary, etc.)
                        // Answer format: "1. item | 2. item | 3. item" or "item, item, item"
                        
                        const expectedAnswers = Array.isArray(currentQuestion.answer) 
                          ? currentQuestion.answer 
                          : currentQuestion.answer.split('|').map(a => a.trim());
                        
                        const numItems = expectedAnswers.length;
                        
                        return (
                          <div>
                            <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg">
                              <p className="text-sm text-orange-700 font-semibold mb-3">
                                🏷️ Identify & List - telc B1
                              </p>
                              <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                                <h4 className="font-bold text-gray-900 mb-2 text-lg">Source Text:</h4>
                                <p className="text-gray-800 text-lg leading-relaxed">
                                  {highlightVocabulary(currentQuestion.text, handleWordClick)}
                                </p>
                              </div>
                              <div className="bg-white p-4 rounded-lg border border-orange-200">
                                <h4 className="font-bold text-gray-900 mb-2">Task:</h4>
                                <p className="text-gray-800">
                                  {highlightVocabulary(currentQuestion.context, handleWordClick)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <p className="text-sm text-orange-700">
                                📝 List the items below - one per line or separated by commas. Spelling and exact format matter!
                              </p>
                            </div>
                            
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Your answer ({numItems} items expected):
                            </label>
                            <textarea
                              value={userAnswer}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              disabled={feedback !== null}
                              placeholder={`Item 1\nItem 2\nItem 3\n...`}
                              rows={numItems > 4 ? numItems + 1 : 5}
                              className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 bg-white text-gray-900"
                              autoFocus
                            />
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm font-semibold text-blue-900 mb-1">💡 Flexible Formats:</p>
                              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                                <li>• <strong>Line by line:</strong> One item per line</li>
                                <li>• <strong>Comma-separated:</strong> item1, item2, item3</li>
                                <li>• <strong>Pipe-separated:</strong> item1 | item2 | item3</li>
                                <li>• <strong>Numbered:</strong> 1. item1 | 2. item2 | 3. item3</li>
                              </ul>
                              <p className="text-xs text-blue-700 mt-2">
                                ⚠️ Make sure spelling is exact - minor typos will be marked incorrect!
                              </p>
                            </div>
                          </div>
                        );
                      })()}

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
                      {currentQuestion.type === 'reading' && currentQuestion.context && (() => {
                        // Check if this is a TRUE/FALSE/NOT MENTIONED question
                        const isTrueFalseQuestion = currentQuestion.text.includes('TRUE, FALSE') || 
                                                    currentQuestion.text.includes('TRUE / FALSE') ||
                                                    currentQuestion.answer === 'TRUE' || 
                                                    currentQuestion.answer === 'FALSE' || 
                                                    currentQuestion.answer === 'NOT MENTIONED';
                        
                        let allOptions: Array<{label: string, content: string}> = [];
                        
                        if (isTrueFalseQuestion) {
                          // For TRUE/FALSE questions, extract the text passage and create options
                          const textContent = currentQuestion.context.replace(/^Text:\s*/, '').replace(/^['"]|['"]$/g, '').trim();
                          
                          // Create TRUE/FALSE/NOT MENTIONED options
                          allOptions = [
                            {
                              label: 'TRUE',
                              content: textContent
                            },
                            {
                              label: 'FALSE',
                              content: textContent
                            },
                            {
                              label: 'NOT MENTIONED',
                              content: textContent
                            }
                          ];
                        } else {
                          // Parse context to extract reading passage and ads/options
                          // Format 1: "Person A sucht: ... | Ad 1: ... | Ad 2: ... | Ad 3: ..." (search + ads)
                          // Format 2: "Person A: '...' | Person B: '...' | Person C: '...'" (person statements - ALL are options!)
                          const contextParts = currentQuestion.context.split('|').map(part => part.trim());
                          
                          // Collect options/persons mentioned in context
                          // For person statements (Format 2), ALL persons are selectable options
                          // For search format (Format 1), skip "sucht:" items - they are criteria, not options
                          allOptions = contextParts
                            .filter(part => {
                              // Skip search criteria items (Person X sucht:)
                              const partLower = part.toLowerCase();
                              return !partLower.includes('sucht:') && 
                                     !partLower.includes('search:') &&
                                     !partLower.includes('looking for:');
                            })
                            .map(part => {
                              const colonIndex = part.indexOf(':');
                              if (colonIndex > 0) {
                                return {
                                  label: part.substring(0, colonIndex).trim(),
                                  content: part.substring(colonIndex + 1).trim()
                                };
                              }
                              return {
                                label: part.split(/\s+/)[0],
                                content: part
                              };
                            });
                          
                          // Also check if answer should be included (like "Person A" not in context but is the answer)
                          const answerLabel = typeof currentQuestion.answer === 'string' ? currentQuestion.answer.trim() : '';
                          const answerInOptions = allOptions.some(opt => opt.label === answerLabel);
                          
                          // If answer is not in options, add it
                          if (!answerInOptions && answerLabel) {
                            // Check if there's a pattern like "Person A" in any context part
                            const answerOption = allOptions.find(opt => opt.content.includes(answerLabel));
                            if (answerOption) {
                              // Already there, just not labeled correctly
                            } else {
                              // Add as a selectable option
                              allOptions.push({
                                label: answerLabel,
                                content: ''
                              });
                            }
                          }
                        }
                        
                        return (
                          <div>
                            {isTrueFalseQuestion ? (
                              // TRUE/FALSE question display
                              <>
                                <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                  <h4 className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wide">
                                    📖 Reading Passage
                                  </h4>
                                  <p className="text-base text-gray-900 leading-relaxed mb-4 bg-white p-4 rounded border border-blue-200">
                                    {highlightVocabulary(allOptions[0].content, handleWordClick)}
                                  </p>
                                  <div className="border-t border-blue-200 pt-4 mt-4">
                                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                                      Statement to Evaluate
                                    </h4>
                                    <p className="text-lg font-semibold text-indigo-800">
                                      {highlightVocabulary(currentQuestion.text.replace(/Statement:\s*/i, '').replace(/\s*-\s*TRUE.*$/i, ''), handleWordClick)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mb-3 text-sm font-semibold text-gray-600">
                                  Select your answer:
                                </div>
                              </>
                            ) : (
                              // Regular reading comprehension display
                              <>
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-lg font-semibold text-gray-900 mb-2">
                                    📖 {highlightVocabulary(currentQuestion.text, handleWordClick)}
                                  </p>
                                  <p className="text-sm text-blue-700">
                                    Click on the correct option below
                                  </p>
                                </div>
                                
                                <div className="mb-3 text-sm font-semibold text-gray-600">
                                  Available Information:
                                </div>
                              </>
                            )}
                            
                            <div className="space-y-3">
                              {allOptions.map((option, idx) => {
                                const isSelected = userAnswer === option.label;
                                const isDisabled = feedback !== null;
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => !isDisabled && setUserAnswer(option.label)}
                                    disabled={isDisabled}
                                    className={`w-full p-5 rounded-lg border-2 transition-all text-left ${
                                      isSelected
                                        ? 'bg-indigo-100 border-indigo-500 shadow-lg scale-[1.02]'
                                        : isDisabled
                                        ? 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
                                        : 'bg-white border-gray-300 hover:border-indigo-400 hover:shadow-md cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-start">
                                      <div className={`w-6 h-6 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-600'
                                          : 'border-gray-400 bg-white'
                                      }`}>
                                        {isSelected && (
                                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className={`font-bold text-lg ${isTrueFalseQuestion ? '' : 'mb-2'} ${isSelected ? 'text-indigo-900' : 'text-indigo-700'}`}>
                                          {option.label}
                                        </div>
                                        {!isTrueFalseQuestion && option.content && (
                                          <div className={`text-base ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {highlightVocabulary(option.content, handleWordClick)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

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
                            {currentQuestion.context.split(/, (?=\d|[A-Z]|No|Yes)/).map((option, idx) => {
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

                      {/* Matching Exercise Type - Drag & Drop */}
                      {(() => {
                        if (currentQuestion.type !== 'match' || !currentQuestion.context) {
                          // Always render MatchQuestion for consistent hook count, but hidden
                          return (
                            <div style={{ display: 'none' }}>
                              <MatchQuestion
                                leftItems={['']}
                                rightItems={['']}
                                onSubmit={() => {}}
                                disabled={true}
                                highlightVocabulary={highlightVocabulary}
                                handleWordClick={handleWordClick}
                              />
                            </div>
                          );
                        }

                        const leftItems = currentQuestion.text.split(',').map(item => item.trim());
                        const rightItems = currentQuestion.context.split(',').map(item => item.trim());
                        
                        // Check if all right items are identical (problematic data structure)
                        const allSame = rightItems.every(item => item === rightItems[0]);
                        
                        const showCategorization = allSame && rightItems.length > 1;
                        
                        if (showCategorization) {
                          // Handle case where all matches are the same (e.g., all "opinion marker")
                          // User needs to verify they understand by clicking each item
                          
                          const handleItemCheck = (idx: number) => {
                            const newChecked = new Set(matchCheckedItems);
                            if (newChecked.has(idx)) {
                              newChecked.delete(idx);
                            } else {
                              newChecked.add(idx);
                            }
                            setMatchCheckedItems(newChecked);
                          };
                          
                          const allChecked = matchCheckedItems.size === leftItems.length;
                          
                          return (
                            <div>
                              <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 rounded-lg">
                                <p className="text-sm text-green-700 font-semibold mb-3">
                                  🏷️ Categorization - telc B1
                                </p>
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                  <h4 className="font-bold text-gray-900 mb-2">Category:</h4>
                                  <p className="text-lg text-indigo-700 font-semibold">
                                    {rightItems[0]}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700">
                                  ✓ Click each item to confirm it belongs to this category ({matchCheckedItems.size}/{leftItems.length} confirmed)
                                </p>
                              </div>
                              
                              <div className="space-y-3 mb-6">
                                {leftItems.map((item, idx) => {
                                  const isChecked = matchCheckedItems.has(idx);
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => !feedback && handleItemCheck(idx)}
                                      disabled={feedback !== null}
                                      className={`w-full p-4 border-2 rounded-lg shadow-sm transition-all text-left ${
                                        isChecked
                                          ? 'bg-green-100 border-green-500'
                                          : 'bg-white border-gray-300 hover:border-green-400'
                                      } ${feedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      <div className="flex items-center">
                                        <div className={`w-8 h-8 border-2 rounded-full flex items-center justify-center mr-3 flex-shrink-0 transition-all ${
                                          isChecked
                                            ? 'bg-green-500 border-green-600'
                                            : 'bg-white border-gray-400'
                                        }`}>
                                          {isChecked ? (
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          ) : (
                                            <span className="text-gray-400 font-bold">{idx + 1}</span>
                                          )}
                                        </div>
                                        <div className="text-lg text-gray-900 flex-1">
                                          {highlightVocabulary(item, handleWordClick)}
                                        </div>
                                        <div className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${
                                          isChecked
                                            ? 'bg-green-200 text-green-800'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {rightItems[0]}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <button
                                onClick={() => {
                                  if (allChecked) {
                                    // Auto-fill answer since user confirmed all items
                                    const matches = leftItems.map(item => `${item}-${rightItems[0]}`);
                                    setUserAnswer(matches.join(', '));
                                    setTimeout(() => checkAnswer(), 100);
                                  }
                                }}
                                disabled={feedback !== null || !allChecked}
                                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                                  feedback !== null || !allChecked
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                                }`}
                              >
                                {feedback !== null ? 'Confirmed' : allChecked ? 'Submit Categorization ✓' : `Confirm All Items (${matchCheckedItems.size}/${leftItems.length})`}
                              </button>
                            </div>
                          );
                        }
                        
                        // Always render MatchQuestion to maintain consistent hook count
                        return (
                          <>
                            <div style={{ display: showCategorization ? 'none' : 'block' }}>
                              <MatchQuestion
                                leftItems={leftItems}
                                rightItems={rightItems}
                                onSubmit={(matches) => {
                                  // Convert array to comma-separated string
                                  setUserAnswer(matches.join(', '));
                                  // Auto-submit after matching
                                  setTimeout(() => checkAnswer(), 100);
                                }}
                                disabled={feedback !== null}
                                highlightVocabulary={highlightVocabulary}
                                handleWordClick={handleWordClick}
                              />
                            </div>
                          </>
                        );
                      })()}

                      {/* Sentence Building/Order Type - Drag & Drop Sortable - ALWAYS RENDERED */}
                      <div style={{ display: currentQuestion.type === 'order' ? 'block' : 'none' }}>
                        <OrderQuestion
                          words={currentQuestion.type === 'order' ? currentQuestion.text.split(/[/,]/).map(word => word.trim()) : ['']}
                          onSubmit={(sentence) => {
                            setUserAnswer(sentence);
                            // Auto-submit after building sentence
                            setTimeout(() => checkAnswer(), 100);
                          }}
                          disabled={feedback !== null}
                          highlightVocabulary={highlightVocabulary}
                          handleWordClick={handleWordClick}
                        />
                      </div>

                      {/* Cloze Passage Type - Inline Inputs - ALWAYS RENDERED */}
                      <div style={{ display: currentQuestion.type === 'cloze' ? 'block' : 'none' }}>
                        <ClozeQuestion
                          passage={currentQuestion.type === 'cloze' ? currentQuestion.text : 'placeholder'}
                          onSubmit={(answers) => {
                            // Convert array to comma-separated string
                            setUserAnswer(answers.join(', '));
                            // Auto-submit after filling all blanks
                            setTimeout(() => checkAnswer(), 100);
                          }}
                          disabled={feedback !== null}
                          highlightVocabulary={highlightVocabulary}
                          handleWordClick={handleWordClick}
                        />
                      </div>

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

                      {/* Interactive Conversation Type */}
                      {currentQuestion.type === 'conversation' && currentQuestion.context && (() => {
                        // Parse conversation turns from context
                        // Format: "Speaker: Text with {blank}|Speaker2: Reply with {blank}|..."
                        const turns = currentQuestion.context.split('|').map(turn => {
                          const [speaker, ...textParts] = turn.split(':');
                          return {
                            speaker: speaker.trim(),
                            text: textParts.join(':').trim()
                          };
                        });
                        
                        const currentTurn = turns[conversationTurnIndex];
                        const isLastTurn = conversationTurnIndex >= turns.length - 1;
                        
                        // Parse blanks in current turn
                        const blanks = currentTurn.text.match(/\{blank\}/g) || [];
                        const numBlanks = blanks.length;
                        
                        // Get correct answers for validation
                        const correctAnswers = Array.isArray(currentQuestion.answer) 
                          ? currentQuestion.answer 
                          : [currentQuestion.answer];
                        
                        // Check if a turn's answer is correct (for immediate feedback)
                        const checkTurnAnswer = (answer: string, turnIdx?: number) => {
                          const idx = turnIdx !== undefined ? turnIdx : conversationTurnIndex;
                          const correctAns = correctAnswers[idx] || '';
                          const userAns = answer.trim().toLowerCase();
                          const correct = correctAns.toLowerCase();
                          
                          // Handle multiple blanks per turn (comma-separated)
                          if (userAns.includes(',') || correct.includes(',')) {
                            const userParts = userAns.split(',').map(p => p.trim());
                            const correctParts = correct.split(',').map(p => p.trim());
                            return userParts.every((up, i) => up === correctParts[i]);
                          }
                          
                          return userAns === correct;
                        };
                        
                        const handleConversationSubmit = () => {
                          if (!userAnswer.trim()) return;
                          
                          // Save the answer for this turn
                          const newAnswers = [...conversationAnswers, userAnswer];
                          setConversationAnswers(newAnswers);
                          
                          if (isLastTurn) {
                            // Last turn - check all answers and finalize
                            // Check if all answers match
                            const allCorrect = newAnswers.every((ans, idx) => {
                              const correctAns = correctAnswers[idx] || '';
                              const userAns = ans.trim().toLowerCase();
                              const correct = correctAns.toLowerCase();
                              
                              // Handle multiple blanks per turn (comma-separated)
                              if (userAns.includes(',') || correct.includes(',')) {
                                const userParts = userAns.split(',').map(p => p.trim());
                                const correctParts = correct.split(',').map(p => p.trim());
                                return userParts.every((up, i) => up === correctParts[i]);
                              }
                              
                              return userAns === correct;
                            });
                            
                            setFeedback({ 
                              correct: allCorrect, 
                              correctAnswer: correctAnswers 
                            });
                            
                            // Update stats
                            setSessionStats(prev => ({
                              correct: prev.correct + (allCorrect ? 1 : 0),
                              total: prev.total + 1
                            }));
                            
                            // Update question stats
                            if (!selectedTopicId || !selectedExerciseId) return;
                            
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
                                                    timesCorrect: q.timesCorrect + (allCorrect ? 1 : 0),
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
                          } else {
                            // Move to next turn
                            setConversationTurnIndex(conversationTurnIndex + 1);
                            setUserAnswer('');
                          }
                        };
                        
                        return (
                          <div>
                            {/* Scenario Description - NEW! */}
                            {currentQuestion.text && (
                              <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-400 rounded-xl p-5 mb-6 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">🎭</span>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-bold text-purple-900 mb-2">SCENARIO</h4>
                                    <p className="text-base text-purple-800 leading-relaxed">
                                      {currentQuestion.text}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-300 rounded-lg p-4 mb-6">
                              <p className="text-sm text-purple-800">
                                <strong>🗨️ Interactive Conversation:</strong> Fill in the blanks to continue the conversation. 
                                <span className="ml-2 text-purple-600 font-semibold">
                                  Turn {conversationTurnIndex + 1} of {turns.length}
                                </span>
                              </p>
                            </div>
                            
                            {/* Previous conversation turns - WITH IMMEDIATE FEEDBACK */}
                            {conversationTurnIndex > 0 && (
                              <div className="mb-6 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-600 mb-3">Previous messages:</h4>
                                {turns.slice(0, conversationTurnIndex).map((turn, idx) => {
                                  // Check if this turn was answered correctly
                                  const userAns = conversationAnswers[idx] || '';
                                  const correctAns = correctAnswers[idx] || '';
                                  const wasCorrect = checkTurnAnswer(userAns, idx);
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-4 rounded-lg border-l-4 ${
                                        idx % 2 === 0 
                                          ? wasCorrect
                                            ? 'bg-green-50 border-green-500 ml-0 mr-8'
                                            : 'bg-red-50 border-red-500 ml-0 mr-8'
                                          : wasCorrect
                                            ? 'bg-green-50 border-green-500 ml-8 mr-0'
                                            : 'bg-red-50 border-red-500 ml-8 mr-0'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="font-semibold text-sm text-gray-700">
                                          {turn.speaker}
                                        </div>
                                        {wasCorrect ? (
                                          <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">✓ Correct</span>
                                        ) : (
                                          <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded">✗ Incorrect</span>
                                        )}
                                      </div>
                                      <div className="text-gray-900">
                                        {turn.text.split('{blank}').map((part, i, arr) => (
                                          <span key={i}>
                                            {highlightVocabulary(part, handleWordClick)}
                                            {i < arr.length - 1 && (
                                              <span className={`inline-block mx-1 px-3 py-1 border-2 rounded font-semibold ${
                                                userAns.split(',')[i]?.trim().toLowerCase() === correctAns.split(',')[i]?.trim().toLowerCase()
                                                  ? 'bg-green-100 border-green-500 text-green-800'
                                                  : 'bg-red-100 border-red-500 text-red-800'
                                              }`}>
                                                {userAns.split(',')[i]?.trim() || '___'}
                                                {!wasCorrect && (
                                                  <span className="text-green-700 text-sm ml-2">
                                                    (→ {correctAns.split(',')[i]?.trim()})
                                                  </span>
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Current turn - Simplified without nested hooks */}
                            {!feedback && (
                              <div 
                                className={`p-5 rounded-lg border-2 mb-6 ${
                                  conversationTurnIndex % 2 === 0 
                                    ? 'bg-blue-50 border-blue-400 ml-0 mr-8' 
                                    : 'bg-green-50 border-green-400 ml-8 mr-0'
                                }`}
                              >
                                <div className="font-bold text-lg text-gray-800 mb-3">
                                  {currentTurn.speaker}
                                </div>
                                <div className="text-lg text-gray-900 mb-4 leading-relaxed">
                                  {highlightVocabulary(currentTurn.text.replace(/\{blank\}/g, '____'), handleWordClick)}
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {numBlanks > 1 
                                      ? `Fill in the ${numBlanks} blanks (comma-separated):` 
                                      : 'Fill in the blank:'}
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={userAnswer}
                                      onChange={(e) => setUserAnswer(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && userAnswer.trim() && handleConversationSubmit()}
                                      placeholder={numBlanks > 1 ? "word1, word2, word3..." : "Type your answer..."}
                                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none bg-white text-gray-900"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleConversationSubmit}
                                      disabled={!userAnswer.trim()}
                                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                        userAnswer.trim()
                                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}
                                    >
                                      {isLastTurn ? 'Finish ✓' : 'Next Turn →'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Show all conversation when feedback is displayed */}
                            {feedback && (
                              <div className="space-y-3 mb-6">
                                {turns.map((turn, idx) => {
                                  const correctAnswers = Array.isArray(currentQuestion.answer) 
                                    ? currentQuestion.answer 
                                    : [currentQuestion.answer];
                                  const userAns = conversationAnswers[idx] || '';
                                  const correctAns = correctAnswers[idx] || '';
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-4 rounded-lg ${
                                        idx % 2 === 0 
                                          ? 'bg-blue-100 border-l-4 border-blue-500 ml-0 mr-8' 
                                          : 'bg-green-100 border-r-4 border-green-500 ml-8 mr-0'
                                      }`}
                                    >
                                      <div className="font-semibold text-sm text-gray-700 mb-1">
                                        {turn.speaker}
                                      </div>
                                      <div className="text-gray-900">
                                        {turn.text.split('{blank}').map((part, i, arr) => (
                                          <span key={i}>
                                            {highlightVocabulary(part, handleWordClick)}
                                            {i < arr.length - 1 && (
                                              <span className={`inline-block mx-1 px-3 py-1 border-2 rounded font-semibold ${
                                                userAns.split(',')[i]?.trim().toLowerCase() === correctAns.split(',')[i]?.trim().toLowerCase()
                                                  ? 'bg-green-100 border-green-500 text-green-800'
                                                  : 'bg-red-100 border-red-500 text-red-800'
                                              }`}>
                                                {userAns.split(',')[i]?.trim() || '___'}
                                                {userAns.split(',')[i]?.trim().toLowerCase() !== correctAns.split(',')[i]?.trim().toLowerCase() && (
                                                  <span className="text-green-700 ml-2">
                                                    (→ {correctAns.split(',')[i]?.trim()})
                                                  </span>
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                          {/* Hide Check Answer button for types that have their own submit button */}
                          {!['match', 'order', 'cloze'].includes(currentQuestion.type) && (
                            <button
                              onClick={checkAnswer}
                              disabled={!userAnswer.trim()}
                              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              Check Answer
                            </button>
                          )}
                          <button
                            onClick={endSession}
                            className={`px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium ${
                              ['match', 'order', 'cloze'].includes(currentQuestion.type) ? 'flex-1' : ''
                            }`}
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
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📚 Create Topic</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Paste exercises in <strong>JSON format</strong> (recommended) or text format. JSON format can include topic metadata to auto-create topics and vocabulary.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-xs font-mono max-h-64 overflow-y-auto">
                  <div className="text-gray-700 mb-2 font-bold">📋 JSON Format (Recommended):</div>
                  <pre className="whitespace-pre-wrap text-gray-600">
{`{
  "topic": {
    "title": "German Dative Case Practice",
    "description": "Practice dative articles and pronouns"
  },
  "exercises": [
    {
      "name": "Dative Articles - Basic",
      "description": "Learn dative articles",
      "questions": [
        {
          "type": "choice",
          "text": "Ich gebe ___ Mann das Buch.",
          "options": ["der", "dem", "den", "des"],
          "answer": "dem"
        },
        {
          "type": "fill-blank",
          "text": "Sie hilft ___ Kind. (das)",
          "answer": "dem"
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "word": "geben",
      "forms": ["geben", "gibt", "gab", "gegeben"],
      "meaning": "to give"
    },
    {
      "word": "Mann",
      "forms": ["der Mann", "des Mannes", "dem Mann", "den Mann", "die Männer"],
      "meaning": "man"
    },
    {
      "word": "helfen",
      "forms": ["helfen", "hilft", "half", "geholfen"],
      "meaning": "to help"
    }
  ]
}`}
                  </pre>
                  
                  <div className="text-gray-700 mb-2 mt-4 font-bold">📝 Text Format (Legacy):</div>
                  <pre className="whitespace-pre-wrap text-gray-600">
{`---EXERCISE---
title: Exercise 1
description: Description here

questions:
Question 1 | Answer 1
---END---

---EXERCISE---
title: Exercise 2
questions:
das Kind >> den Kindern
---END---`}
                  </pre>
                </div>

                <textarea
                  value={bulkExercisesText}
                  onChange={(e) => setBulkExercisesText(e.target.value)}
                  placeholder="Paste JSON or text format here..."
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
                    Add Exercises
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

      </div>
    </div>
  );
}

export default App;