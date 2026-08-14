import { UserProgress, DEFAULT_PROGRESS, Settings, LessonProgress, TestResult, LessonResult, KeyStats, Achievement, GameScore } from '../models/types';

const DB_NAME = 'TypingMasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'progress';
const KEY = 'userProgress';

export class StorageService {
  private db: IDBDatabase | null = null;
  private memoryFallback: UserProgress | null = null;
  private useMemory = false;

  async init(): Promise<void> {
    try {
      this.db = await this.openDB();
    } catch {
      this.useMemory = true;
      this.memoryFallback = this.loadFromLocalStorage() || structuredClone(DEFAULT_PROGRESS);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  private loadFromLocalStorage(): UserProgress | null {
    try {
      const raw = localStorage.getItem('tm_progress');
      if (raw) return JSON.parse(raw) as UserProgress;
    } catch { /* ignore */ }
    return null;
  }

  private saveToLocalStorage(data: UserProgress): void {
    try {
      localStorage.setItem('tm_progress', JSON.stringify(data));
    } catch { /* ignore */ }
  }

  async loadUserProgress(): Promise<UserProgress> {
    if (this.useMemory) {
      return this.memoryFallback || structuredClone(DEFAULT_PROGRESS);
    }
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(this.loadFromLocalStorage() || structuredClone(DEFAULT_PROGRESS));
        return;
      }
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => {
        const data = req.result as UserProgress | undefined;
        if (data && data.version) {
          resolve(this.migrate(data));
        } else {
          const fallback = this.loadFromLocalStorage();
          resolve(fallback || structuredClone(DEFAULT_PROGRESS));
        }
      };
      req.onerror = () => {
        resolve(this.loadFromLocalStorage() || structuredClone(DEFAULT_PROGRESS));
      };
    });
  }

  async saveUserProgress(progress: UserProgress): Promise<void> {
    this.saveToLocalStorage(progress);
    if (this.useMemory) {
      this.memoryFallback = progress;
      return;
    }
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(progress, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private migrate(data: UserProgress): UserProgress {
    if (!data.settings) data.settings = { ...DEFAULT_PROGRESS.settings };
    if (!data.lessons) data.lessons = {};
    if (!data.keyStats) data.keyStats = {};
    if (!data.testResults) data.testResults = [];
    if (!data.lessonResults) data.lessonResults = [];
    if (!data.achievements) data.achievements = {};
    if (!data.gameScores) data.gameScores = [];
    return data;
  }

  async exportData(): Promise<string> {
    const progress = await this.loadUserProgress();
    return JSON.stringify(progress, null, 2);
  }

  async importData(json: string): Promise<boolean> {
    try {
      const data = JSON.parse(json) as UserProgress;
      if (!data || typeof data !== 'object' || !data.version) return false;
      // Sanitize - never execute anything
      const clean = this.migrate(data);
      clean.firstLaunch = false;
      await this.saveUserProgress(clean);
      return true;
    } catch {
      return false;
    }
  }

  async resetAllData(): Promise<void> {
    const fresh = structuredClone(DEFAULT_PROGRESS);
    await this.saveUserProgress(fresh);
  }

  // Convenience helpers
  async updateSettings(settings: Partial<Settings>): Promise<UserProgress> {
    const progress = await this.loadUserProgress();
    progress.settings = { ...progress.settings, ...settings };
    await this.saveUserProgress(progress);
    return progress;
  }

  async saveLessonProgress(lessonId: number, update: Partial<LessonProgress>): Promise<void> {
    const progress = await this.loadUserProgress();
    const existing = progress.lessons[lessonId] || {
      lessonId,
      completed: false,
      attempts: 0,
      bestAccuracy: 0,
      bestWpm: 0,
      lastAttempt: 0,
      timesCompleted: 0
    };
    progress.lessons[lessonId] = { ...existing, ...update };
    await this.saveUserProgress(progress);
  }

  async addTestResult(result: TestResult): Promise<void> {
    const progress = await this.loadUserProgress();
    progress.testResults.unshift(result);
    if (progress.testResults.length > 100) progress.testResults.length = 100;
    if (result.wpm > progress.bestWpm) progress.bestWpm = result.wpm;
    await this.saveUserProgress(progress);
  }

  async addLessonResult(result: LessonResult): Promise<void> {
    const progress = await this.loadUserProgress();
    progress.lessonResults.unshift(result);
    if (progress.lessonResults.length > 200) progress.lessonResults.length = 200;
    await this.saveUserProgress(progress);
  }

  async updateKeyStats(key: string, correct: boolean, timeMs: number): Promise<void> {
    const progress = await this.loadUserProgress();
    const k = key.toLowerCase();
    const existing = progress.keyStats[k] || {
      key: k,
      attempts: 0,
      correct: 0,
      errors: 0,
      totalTimeMs: 0,
      lastPracticed: 0,
      masteryScore: 50,
      nextReview: Date.now()
    };
    existing.attempts++;
    if (correct) existing.correct++;
    else existing.errors++;
    existing.totalTimeMs += timeMs;
    existing.lastPracticed = Date.now();
    const accuracy = existing.correct / existing.attempts;
    existing.masteryScore = Math.round(accuracy * 100);
    // Simple spaced review: lower mastery = sooner review
    const days = accuracy > 0.95 ? 7 : accuracy > 0.85 ? 3 : accuracy > 0.7 ? 1 : 0.5;
    existing.nextReview = Date.now() + days * 24 * 60 * 60 * 1000;
    progress.keyStats[k] = existing;
    await this.saveUserProgress(progress);
  }

  async unlockAchievement(id: string, achievement: Achievement): Promise<boolean> {
    const progress = await this.loadUserProgress();
    if (progress.achievements[id]?.unlocked) return false;
    progress.achievements[id] = { ...achievement, unlocked: true, unlockedAt: Date.now() };
    await this.saveUserProgress(progress);
    return true;
  }

  async addGameScore(score: GameScore): Promise<void> {
    const progress = await this.loadUserProgress();
    progress.gameScores.unshift(score);
    if (progress.gameScores.length > 50) progress.gameScores.length = 50;
    await this.saveUserProgress(progress);
  }
}
