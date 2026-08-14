export type Theme = 'dark' | 'light' | 'system';
export type ExperienceLevel = 'complete-beginner' | 'beginner' | 'intermediate' | 'advanced';
export type FocusGoal = 'speed' | 'accuracy' | 'both';
export type KeyboardLayout = 'us-qwerty';

export interface Settings {
  theme: Theme;
  soundEffects: boolean;
  typingSounds: boolean;
  masterVolume: number;
  showKeyboard: boolean;
  showFingerGuide: boolean;
  showWpm: boolean;
  showAccuracy: boolean;
  showErrors: boolean;
  showTimer: boolean;
  backspaceAllowed: boolean;
  keyboardLayout: KeyboardLayout;
  reducedMotion: boolean;
}

export interface KeyStats {
  key: string;
  attempts: number;
  correct: number;
  errors: number;
  totalTimeMs: number;
  lastPracticed: number;
  masteryScore: number;
  nextReview: number;
}

export interface LessonProgress {
  lessonId: number;
  completed: boolean;
  attempts: number;
  bestAccuracy: number;
  bestWpm: number;
  lastAttempt: number;
  timesCompleted: number;
}

export interface TestResult {
  id: string;
  timestamp: number;
  duration: number;
  mode: string;
  wpm: number;
  netWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
}

export interface LessonResult {
  lessonId: number;
  timestamp: number;
  wpm: number;
  accuracy: number;
  errors: number;
  duration: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  target?: number;
}

export interface GameScore {
  game: string;
  score: number;
  timestamp: number;
  level: number;
}

export interface UserProgress {
  version: number;
  firstLaunch: boolean;
  experienceLevel: ExperienceLevel;
  focusGoal: FocusGoal;
  currentLessonId: number;
  lessons: Record<number, LessonProgress>;
  keyStats: Record<string, KeyStats>;
  testResults: TestResult[];
  lessonResults: LessonResult[];
  achievements: Record<string, Achievement>;
  gameScores: GameScore[];
  totalPracticeTimeMs: number;
  totalKeystrokes: number;
  totalCharacters: number;
  totalErrors: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
  bestWpm: number;
  averageWpm: number;
  averageAccuracy: number;
  settings: Settings;
}

export interface LessonExercise {
  text: string;
  type?: 'drill' | 'words' | 'sentence' | 'paragraph';
}

export interface Lesson {
  id: number;
  number: number;
  title: string;
  description: string;
  level: string;
  difficulty: number;
  targetKeys: string[];
  targetFingers: string[];
  exercises: LessonExercise[];
  requirements: {
    accuracy: number;
    minRepetitions?: number;
    targetWpm?: number;
  };
  reviewMaterial?: string;
}

export interface TypingMetrics {
  wpm: number;
  netWpm: number;
  cpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  incorrectChars: number;
  backspaces: number;
  elapsedMs: number;
  progress: number;
  charsPerSecond: number;
  wordsTyped: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  soundEffects: true,
  typingSounds: true,
  masterVolume: 0.5,
  showKeyboard: true,
  showFingerGuide: true,
  showWpm: true,
  showAccuracy: true,
  showErrors: true,
  showTimer: true,
  backspaceAllowed: true,
  keyboardLayout: 'us-qwerty',
  reducedMotion: false
};

export const DEFAULT_PROGRESS: UserProgress = {
  version: 1,
  firstLaunch: true,
  experienceLevel: 'complete-beginner',
  focusGoal: 'both',
  currentLessonId: 1,
  lessons: {},
  keyStats: {},
  testResults: [],
  lessonResults: [],
  achievements: {},
  gameScores: [],
  totalPracticeTimeMs: 0,
  totalKeystrokes: 0,
  totalCharacters: 0,
  totalErrors: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: '',
  bestWpm: 0,
  averageWpm: 0,
  averageAccuracy: 0,
  settings: { ...DEFAULT_SETTINGS }
};

// Finger mapping for US QWERTY
export const FINGER_MAP: Record<string, string> = {
  // Left hand
  '`': 'left-pinky', '1': 'left-pinky', 'q': 'left-pinky', 'a': 'left-pinky', 'z': 'left-pinky',
  '2': 'left-ring', 'w': 'left-ring', 's': 'left-ring', 'x': 'left-ring',
  '3': 'left-middle', 'e': 'left-middle', 'd': 'left-middle', 'c': 'left-middle',
  '4': 'left-index', '5': 'left-index', 'r': 'left-index', 't': 'left-index', 'f': 'left-index', 'g': 'left-index', 'v': 'left-index', 'b': 'left-index',
  // Right hand
  '6': 'right-index', '7': 'right-index', 'y': 'right-index', 'u': 'right-index', 'h': 'right-index', 'j': 'right-index', 'n': 'right-index', 'm': 'right-index',
  '8': 'right-middle', 'i': 'right-middle', 'k': 'right-middle', ',': 'right-middle',
  '9': 'right-ring', 'o': 'right-ring', 'l': 'right-ring', '.': 'right-ring',
  '0': 'right-pinky', '-': 'right-pinky', '=': 'right-pinky', 'p': 'right-pinky', '[': 'right-pinky', ']': 'right-pinky', '\\': 'right-pinky',
  ';': 'right-pinky', "'": 'right-pinky', '/': 'right-pinky',
  // Special
  ' ': 'thumb',
  'ShiftLeft': 'left-pinky',
  'ShiftRight': 'right-pinky',
  'Tab': 'left-pinky',
  'CapsLock': 'left-pinky',
  'Enter': 'right-pinky',
  'Backspace': 'right-pinky',
  'ControlLeft': 'left-pinky',
  'ControlRight': 'right-pinky',
  'AltLeft': 'left-thumb',
  'AltRight': 'right-thumb'
};

export const FINGER_LABELS: Record<string, string> = {
  'left-pinky': 'Left Pinky',
  'left-ring': 'Left Ring',
  'left-middle': 'Left Middle',
  'left-index': 'Left Index',
  'left-thumb': 'Left Thumb',
  'right-index': 'Right Index',
  'right-middle': 'Right Middle',
  'right-ring': 'Right Ring',
  'right-pinky': 'Right Pinky',
  'right-thumb': 'Right Thumb',
  'thumb': 'Thumbs'
};

// Shift pairs for symbols
export const SHIFT_MAP: Record<string, string> = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/'
};
