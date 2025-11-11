import { useState, useEffect } from 'react';
import { Trash2, Plus, BookOpen, Target, Edit2, Check, X } from 'lucide-react';

const STORAGE_KEY = 'german-practice-data';

interface Question {
  id: string;
  text: string;
  answer: string;
  timesAnswered: number;
  timesCorrect: number;
  lastReviewed: string | null;
}

interface Exercise {
  id: string;
  name: string;
  questions: Question[];
}

interface Feedback {
  correct: boolean;
  correctAnswer: string;
}

interface ExerciseStats {
  total: number;
  mastered: number;
  middle: number;
  weak: number;
  new: number;
  correctRate: number;
}

type MasteryLevel = 'new' | 'weak' | 'middle' | 'mastered';

// Mastery levels based on correct percentage AND minimum attempts
const getMasteryLevel = (timesAnswered: number, timesCorrect: number): MasteryLevel => {
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
    // Mature stage - can reach mastered
    if (percentage >= 85 && timesCorrect >= 5) return 'mastered';
    if (percentage >= 60) return 'middle';
    return 'weak';
  }
};

const getMasteryColor = (level: MasteryLevel): string => {
  const colors = {
    new: 'bg-gray-100 text-gray-700',
    weak: 'bg-red-100 text-red-700',
    middle: 'bg-yellow-100 text-yellow-700',
    mastered: 'bg-green-100 text-green-700'
  };
  return colors[level];
};

const getMasteryLabel = (level: MasteryLevel): string => {
  const labels = {
    new: 'New',
    weak: 'Weak',
    middle: 'Learning',
    mastered: 'Mastered'
  };
  return labels[level];
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
const getReviewInterval = (level: MasteryLevel): number => {
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

function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [view, setView] = useState('list'); // list, add, practice
  const [newExerciseName, setNewExerciseName] = useState('');
  const [singleQuestion, setSingleQuestion] = useState({ text: '', answer: '' });
  const [bulkText, setBulkText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 }); // Session statistics
  const [sessionPool, setSessionPool] = useState<Question[]>([]); // Pre-selected questions for the session
  const [sessionSize, setSessionSize] = useState(10); // Number of questions per session
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Track position in session

  // Load data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setExercises(data.exercises || []);
      } catch (e) {
        console.error('Failed to parse stored data');
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (exercises.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ exercises }));
    }
  }, [exercises]);

  const createExercise = () => {
    if (!newExerciseName.trim()) return;
    
    const newExercise = {
      id: Date.now().toString(),
      name: newExerciseName.trim(),
      questions: []
    };
    
    setExercises([...exercises, newExercise]);
    setNewExerciseName('');
    setSelectedExerciseId(newExercise.id);
    setView('add');
  };

  const deleteExercise = (id: string) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      setExercises(exercises.filter(e => e.id !== id));
      if (selectedExerciseId === id) {
        setSelectedExerciseId(null);
        setView('list');
      }
    }
  };

  const startEditExercise = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setEditingName(exercise.name);
  };

  const saveExerciseName = () => {
    if (!editingName.trim()) return;
    
    setExercises(exercises.map(e => 
      e.id === editingExerciseId 
        ? { ...e, name: editingName.trim() }
        : e
    ));
    setEditingExerciseId(null);
    setEditingName('');
  };

  const addSingleQuestion = () => {
    if (!singleQuestion.text.trim() || !singleQuestion.answer.trim()) return;
    
    const exercise = exercises.find(e => e.id === selectedExerciseId);
    if (!exercise) return;

    const newQuestion = {
      id: Date.now().toString(),
      text: singleQuestion.text.trim(),
      answer: singleQuestion.answer.trim(),
      timesAnswered: 0,
      timesCorrect: 0,
      lastReviewed: null
    };

    setExercises(exercises.map(e => 
      e.id === selectedExerciseId
        ? { ...e, questions: [...e.questions, newQuestion] }
        : e
    ));

    setSingleQuestion({ text: '', answer: '' });
  };

  const addBulkQuestions = () => {
    if (!bulkText.trim()) return;
    
    const exercise = exercises.find(e => e.id === selectedExerciseId);
    if (!exercise) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    const newQuestions: Question[] = [];

    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        newQuestions.push({
          id: `${Date.now()}-${Math.random()}`,
          text: parts[0],
          answer: parts[1],
          timesAnswered: 0,
          timesCorrect: 0,
          lastReviewed: null
        });
      }
    });

    if (newQuestions.length > 0) {
      setExercises(exercises.map(e => 
        e.id === selectedExerciseId
          ? { ...e, questions: [...e.questions, ...newQuestions] }
          : e
      ));
      setBulkText('');
    }
  };

  const deleteQuestion = (questionId: string) => {
    setExercises(exercises.map(e => 
      e.id === selectedExerciseId
        ? { ...e, questions: e.questions.filter(q => q.id !== questionId) }
        : e
    ));
  };

  const createSessionPool = (questions: Question[], size: number) => {
    // First, get questions that are due for review
    const dueQuestions = questions.filter(q => isDueForReview(q.timesAnswered, q.timesCorrect, q.lastReviewed));
    
    let pool = [];
    const usedIds = new Set();

    // If we have enough due questions, use them
    if (dueQuestions.length >= size) {
      // Select randomly from due questions
      const shuffled = [...dueQuestions].sort(() => Math.random() - 0.5);
      pool = shuffled.slice(0, size).map(q => ({ ...q, weight: 3 }));
    } else {
      // Use all due questions and fill the rest with the current SRS logic
      pool = dueQuestions.map(q => ({ ...q, weight: 3 }));
      usedIds.clear();
      dueQuestions.forEach(q => usedIds.add(q.id));
      
      const remainingNeeded = size - dueQuestions.length;
      if (remainingNeeded > 0) {
        // Group remaining questions by mastery level
        const weak = questions.filter(q => !usedIds.has(q.id) && getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'weak');
        const middle = questions.filter(q => !usedIds.has(q.id) && getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'middle');
        const newQ = questions.filter(q => !usedIds.has(q.id) && getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'new');
        const mastered = questions.filter(q => !usedIds.has(q.id) && getMasteryLevel(q.timesAnswered, q.timesCorrect) === 'mastered');

        // Calculate distribution for remaining slots
        const weakTarget = Math.floor(remainingNeeded * 0.5);
        const middleTarget = Math.floor(remainingNeeded * 0.3);
        const newTarget = Math.floor(remainingNeeded * 0.15);
        const masteredTarget = remainingNeeded - weakTarget - middleTarget - newTarget;

        // Helper function to add questions with weighted random selection
        const addFromCategory = (category: Question[], target: number, weight: number) => {
          const available = category.filter(q => !usedIds.has(q.id));
          const toAdd = Math.min(target, available.length);
          
          for (let i = 0; i < toAdd; i++) {
            if (available.length === 0) break;
            const randomIndex = Math.floor(Math.random() * available.length);
            const question = available[randomIndex];
            pool.push({ ...question, weight });
            usedIds.add(question.id);
            available.splice(randomIndex, 1);
          }
          
          return toAdd;
        };

        // Add questions in priority order
        addFromCategory(weak, weakTarget, 5);
        addFromCategory(middle, middleTarget, 3);
        addFromCategory(newQ, newTarget, 2);
        addFromCategory(mastered, masteredTarget, 1);
      }
    }

    // Shuffle the pool to randomize order
    return pool.sort(() => Math.random() - 0.5);
  };

  const startPractice = () => {
    const exercise = exercises.find(e => e.id === selectedExerciseId);
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
    if (!userAnswer.trim() || !currentQuestion) return;

    const correct = userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase();
    
    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    setExercises(exercises.map(e => 
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
    ));

    setFeedback({ correct, correctAnswer: currentQuestion.answer });
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    // Check if session is complete
    if (nextIndex >= sessionPool.length) {
      // Session complete - show summary
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
    if (!window.confirm('Reset all progress for this exercise?')) return;

    setExercises(exercises.map(e => 
      e.id === selectedExerciseId
        ? {
            ...e,
            questions: e.questions.map(q => ({
              ...q,
              timesAnswered: 0,
              timesCorrect: 0
            }))
          }
        : e
    ));
  };

  const getExerciseStats = (exercise: Exercise): ExerciseStats => {
    if (!exercise || exercise.questions.length === 0) {
      return { total: 0, mastered: 0, middle: 0, weak: 0, new: 0, correctRate: 0 };
    }

    const stats: ExerciseStats = {
      total: exercise.questions.length,
      mastered: 0,
      middle: 0,
      weak: 0,
      new: 0,
      correctRate: 0
    };

    let totalAnswered = 0;
    let totalCorrect = 0;

    exercise.questions.forEach(q => {
      const level = getMasteryLevel(q.timesAnswered, q.timesCorrect);
      stats[level]++;
      totalAnswered += q.timesAnswered;
      totalCorrect += q.timesCorrect;
    });

    stats.correctRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return stats;
  };

  const getMasteryInfo = (timesAnswered: number, timesCorrect: number, lastReviewed: string | null) => {
    const level = getMasteryLevel(timesAnswered, timesCorrect);
    const percentage = timesAnswered > 0 ? (timesCorrect / timesAnswered) * 100 : 0;
    const daysSince = getDaysSinceLastReview(lastReviewed);
    const interval = getReviewInterval(level);
    const daysUntilDue = Math.max(0, interval - daysSince);
    
    let nextMilestone = '';
    if (level === 'new') {
      nextMilestone = 'Answer to start learning';
    } else if (level === 'weak') {
      const needed = Math.ceil(timesAnswered * 0.6) - timesCorrect;
      nextMilestone = needed > 0 ? `${needed} more correct for middle` : 'Keep practicing!';
    } else if (level === 'middle') {
      if (timesAnswered < 5) {
        nextMilestone = `${5 - timesAnswered} more attempts needed for mastered`;
      } else {
        const targetCorrect = Math.ceil(timesAnswered * 0.85);
        const needed = targetCorrect - timesCorrect;
        nextMilestone = needed > 0 ? `${needed} more correct for mastered` : 'Almost there!';
      }
    } else {
      if (daysUntilDue === 0) {
        nextMilestone = 'Due for review now!';
      } else if (daysUntilDue === 1) {
        nextMilestone = 'Due for review tomorrow';
      } else {
        nextMilestone = `Due for review in ${daysUntilDue} days`;
      }
    }
    
    return { level, percentage, nextMilestone, daysUntilDue };
  };

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);
  const stats = selectedExercise ? getExerciseStats(selectedExercise) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">German Practice Trainer</h1>
          <p className="text-indigo-600">Master German grammar with smart practice</p>
        </header>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Exercises
              </h2>

              {/* Create Exercise */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="New exercise name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createExercise()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                />
                <button
                  onClick={createExercise}
                  className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </button>
              </div>

              {/* Exercise List */}
              <div className="space-y-2">
                {exercises.map(exercise => {
                  const exerciseStats = getExerciseStats(exercise);
                  const isEditing = editingExerciseId === exercise.id;
                  
                  return (
                    <div
                      key={exercise.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedExerciseId === exercise.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && saveExerciseName()}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                            autoFocus
                          />
                          <button onClick={saveExerciseName} className="text-green-600 hover:text-green-700">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingExerciseId(null)} className="text-red-600 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <button
                              onClick={() => {
                                setSelectedExerciseId(exercise.id);
                                setView('add');
                              }}
                              className="flex-1 text-left font-semibold text-gray-800 text-sm hover:text-indigo-600"
                            >
                              {exercise.name}
                            </button>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditExercise(exercise)}
                                className="text-gray-500 hover:text-indigo-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteExercise(exercise.id)}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            {exerciseStats.total} questions
                          </div>
                          <div className="flex gap-1 mt-2">
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
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
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
                    
                    {view === 'add' && (
                      <div className="flex items-center gap-3 pt-2 border-t">
                        <label className="text-sm font-medium text-gray-700">
                          Session Size:
                        </label>
                        <select
                          value={sessionSize}
                          onChange={(e) => setSessionSize(Number(e.target.value))}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value={5}>5 questions</option>
                          <option value={10}>10 questions</option>
                          <option value={15}>15 questions</option>
                          <option value={20}>20 questions</option>
                          <option value={25}>25 questions</option>
                          <option value={30}>30 questions</option>
                        </select>
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
                    {stats.total > 0 && (
                      <button
                        onClick={resetProgress}
                        className="mt-4 w-full bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm hover:bg-red-100"
                      >
                        Reset Progress
                      </button>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Correct answer"
                          value={singleQuestion.answer}
                          onChange={(e) => setSingleQuestion({ ...singleQuestion, answer: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md"
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
                      <p className="text-sm text-gray-600 mb-3">
                        Format: <code className="bg-gray-100 px-2 py-1 rounded">Question with ___ | answer</code>
                      </p>
                      <textarea
                        placeholder="Ich sehe ___ Hund. | den&#10;___ Frau arbeitet im Büro. | die"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm"
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
                            return (
                              <div key={q.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">{q.text}</div>
                                  <div className="text-sm text-gray-600">Answer: <span className="font-semibold">{q.answer}</span></div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`text-xs px-2 py-1 rounded ${getMasteryColor(getMasteryLevel(q.timesAnswered, q.timesCorrect))}`}>
                                      {getMasteryLabel(getMasteryLevel(q.timesAnswered, q.timesCorrect))}
                                    </span>
                                    {q.timesAnswered > 0 && (
                                      <>
                                        <span className="text-xs text-gray-500">
                                          {q.timesCorrect}/{q.timesAnswered} correct
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({Math.round((q.timesCorrect / q.timesAnswered) * 100)}%)
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {q.timesAnswered > 0 && (
                                    <div className="text-xs text-indigo-600 mt-1">
                                      {getMasteryInfo(q.timesAnswered, q.timesCorrect, q.lastReviewed).nextMilestone}
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
                {view === 'practice' && currentQuestion && (
                  <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Session Progress */}
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded text-sm ${getMasteryColor(
                          getMasteryLevel(currentQuestion.timesAnswered, currentQuestion.timesCorrect)
                        )}`}>
                          {getMasteryLabel(getMasteryLevel(currentQuestion.timesAnswered, currentQuestion.timesCorrect))}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Session Progress</div>
                        <div className="text-lg font-bold text-indigo-600">
                          Question {currentQuestionIndex + 1}/{sessionPool.length}
                        </div>
                        <div className="text-sm text-gray-600">
                          Score: {sessionStats.correct}/{sessionStats.total}
                          {sessionStats.total > 0 && (
                            <span className="ml-1">
                              ({Math.round((sessionStats.correct / sessionStats.total) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${((currentQuestionIndex + 1) / sessionPool.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-gray-800 mb-6">
                        {currentQuestion.text}
                      </h3>

                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                        disabled={feedback !== null}
                        placeholder="Type your answer..."
                        className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                        autoFocus
                      />
                    </div>

                    {feedback && (
                      <div className={`p-6 rounded-lg mb-6 ${
                        feedback.correct ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
                      }`}>
                        <div className="flex items-center mb-2">
                          {feedback.correct ? (
                            <Check className="w-6 h-6 text-green-600 mr-2" />
                          ) : (
                            <X className="w-6 h-6 text-red-600 mr-2" />
                          )}
                          <span className={`text-xl font-bold ${
                            feedback.correct ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {feedback.correct ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        {!feedback.correct && (
                          <p className="text-red-700">
                            Correct answer: <span className="font-bold">{feedback.correctAnswer}</span>
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
      </div>
    </div>
  );
}

export default App;
