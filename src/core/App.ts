import { StorageService } from '../storage/StorageService';
import { AudioService } from '../services/AudioService';
import { TypingEngine } from '../engine/TypingEngine';
import { UserProgress, Lesson, DEFAULT_SETTINGS, FINGER_MAP, FINGER_LABELS } from '../models/types';
import { loadAllLessons, getLessonById } from '../data/LessonLoader';
import { ACHIEVEMENTS_DEF } from '../data/achievements';
import { Router } from './Router';

export class App {
  storage = new StorageService();
  audio = new AudioService();
  engine = new TypingEngine();
  progress!: UserProgress;
  lessons: Lesson[] = [];
  router = new Router();
  private currentView = '';
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  async init() {
    await this.storage.init();
    this.progress = await this.storage.loadUserProgress();
    this.applyTheme();
    this.audio.setEnabled(this.progress.settings.soundEffects);
    this.audio.setTypingEnabled(this.progress.settings.typingSounds);
    this.audio.setVolume(this.progress.settings.masterVolume);

    this.lessons = await loadAllLessons();
    this.ensureAchievements();

    this.renderShell();
    this.setupOfflineIndicator();
    this.setupKeyboardShortcuts();

    if (this.progress.firstLaunch) {
      this.router.navigate('onboarding');
    } else {
      this.router.navigate(this.router.getRoute() || 'dashboard');
    }

    this.router.onChange((route) => this.renderView(route));
    window.addEventListener('hashchange', () => {
      this.router.navigate(this.router.getRoute());
    });
  }

  private ensureAchievements() {
    for (const def of ACHIEVEMENTS_DEF) {
      if (!this.progress.achievements[def.id]) {
        this.progress.achievements[def.id] = { ...def, unlocked: false };
      }
    }
  }

  applyTheme() {
    const t = this.progress.settings.theme;
    let theme = t;
    if (t === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }

  private renderShell() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <svg viewBox="0 0 100 100" fill="none"><rect x="8" y="28" width="84" height="52" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/><rect x="18" y="38" width="12" height="12" rx="2" fill="#3b82f6"/><rect x="34" y="38" width="12" height="12" rx="2" fill="#64748b"/><rect x="50" y="38" width="12" height="12" rx="2" fill="#64748b"/><rect x="66" y="38" width="12" height="12" rx="2" fill="#64748b"/><rect x="26" y="54" width="48" height="10" rx="2" fill="#8b5cf6"/><path d="M50 12 L58 22 L42 22 Z" fill="#3b82f6"/></svg>
          <h1>Typing Master</h1>
        </div>
        <nav class="sidebar-nav" id="nav">
          ${this.navItems().map(n => `
            <button class="nav-item" data-route="${n.route}">
              ${n.icon}<span>${n.label}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">Build Speed. Build Accuracy.<br>Build Muscle Memory.</div>
      </aside>
      <div class="main">
        <header class="header">
          <div class="header-title" id="page-title">Dashboard</div>
          <div class="header-actions">
            <button class="btn btn-ghost btn-sm" id="theme-toggle" title="Toggle theme">◐</button>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
      <div class="toast-container" id="toasts"></div>
      <div class="offline-badge" id="offline-badge">OFFLINE MODE — Progress saved on this device</div>
    `;

    document.getElementById('nav')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-route]') as HTMLElement;
      if (btn) this.router.navigate(btn.dataset.route!);
    });

    document.getElementById('theme-toggle')!.addEventListener('click', () => {
      const cur = this.progress.settings.theme;
      const next = cur === 'dark' ? 'light' : cur === 'light' ? 'system' : 'dark';
      this.progress.settings.theme = next;
      this.storage.saveUserProgress(this.progress);
      this.applyTheme();
      this.toast(`Theme: ${next}`, 'success');
    });
  }

  private navItems() {
    const icon = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
    return [
      { route: 'dashboard', label: 'Dashboard', icon: icon('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>') },
      { route: 'learn', label: 'Learn', icon: icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>') },
      { route: 'practice', label: 'Practice', icon: icon('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>') },
      { route: 'test', label: 'Typing Test', icon: icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>') },
      { route: 'games', label: 'Games', icon: icon('<polygon points="5 3 19 12 5 21 5 3"/>') },
      { route: 'review', label: 'Review', icon: icon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>') },
      { route: 'statistics', label: 'Statistics', icon: icon('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>') },
      { route: 'achievements', label: 'Achievements', icon: icon('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>') },
      { route: 'keyboard', label: 'Keyboard', icon: icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"/>') },
      { route: 'settings', label: 'Settings', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>') },
      { route: 'about', label: 'About', icon: icon('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>') },
    ];
  }

  private setActiveNav(route: string) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', (el as HTMLElement).dataset.route === route.split('/')[0]);
    });
  }

  private renderView(route: string) {
    this.unbindTyping();
    this.currentView = route;
    this.setActiveNav(route);
    const content = document.getElementById('content')!;
    const title = document.getElementById('page-title')!;
    const base = route.split('/')[0];

    const titles: Record<string, string> = {
      dashboard: 'Dashboard', learn: 'Learn', practice: 'Practice',
      test: 'Typing Test', games: 'Games', review: 'Weak Key Review',
      statistics: 'Statistics', achievements: 'Achievements',
      keyboard: 'Keyboard Guide', settings: 'Settings', about: 'About',
      onboarding: 'Welcome', lesson: 'Lesson', result: 'Results'
    };
    title.textContent = titles[base] || 'Typing Master';

    switch (base) {
      case 'dashboard': content.innerHTML = this.viewDashboard(); break;
      case 'learn': content.innerHTML = this.viewLearn(); this.bindLearn(); break;
      case 'practice': content.innerHTML = this.viewPractice(); this.bindPractice(); break;
      case 'test': content.innerHTML = this.viewTest(); this.bindTest(); break;
      case 'games': content.innerHTML = this.viewGames(); this.bindGames(); break;
      case 'review': content.innerHTML = this.viewReview(); this.bindReview(); break;
      case 'statistics': content.innerHTML = this.viewStatistics(); break;
      case 'achievements': content.innerHTML = this.viewAchievements(); break;
      case 'keyboard': content.innerHTML = this.viewKeyboard(); break;
      case 'settings': content.innerHTML = this.viewSettings(); this.bindSettings(); break;
      case 'about': content.innerHTML = this.viewAbout(); break;
      case 'onboarding': content.innerHTML = this.viewOnboarding(); this.bindOnboarding(); break;
      case 'lesson': {
        const id = parseInt(route.split('/')[1] || '1', 10);
        content.innerHTML = this.viewLesson(id);
        this.bindLesson(id);
        break;
      }
      default: content.innerHTML = this.viewDashboard();
    }
  }

  // ========== VIEWS ==========

  private viewDashboard(): string {
    const p = this.progress;
    const completed = Object.values(p.lessons).filter(l => l.completed).length;
    const current = getLessonById(this.lessons, p.currentLessonId);
    const weak = this.getWeakKeys(5);
    return `
      <div class="grid grid-4" style="margin-bottom:24px">
        <div class="card"><div class="card-title">Best WPM</div><div class="card-value">${p.bestWpm || 0}</div></div>
        <div class="card"><div class="card-title">Avg Accuracy</div><div class="card-value">${p.averageAccuracy || 0}%</div></div>
        <div class="card"><div class="card-title">Lessons Done</div><div class="card-value">${completed}/${this.lessons.length}</div></div>
        <div class="card"><div class="card-title">Streak</div><div class="card-value">${p.currentStreak} day${p.currentStreak !== 1 ? 's' : ''}</div></div>
      </div>
      <div class="card" style="margin-bottom:24px">
        <div class="card-title">Continue Learning</div>
        <h2 style="font-size:1.2rem;margin:8px 0">${current ? current.title : 'All lessons complete!'}</h2>
        <p style="color:var(--text-muted);margin-bottom:16px">${current ? current.description : 'Great job mastering the course.'}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-lg" id="btn-continue">Continue Lesson</button>
          <button class="btn btn-secondary" id="btn-practice">Practice</button>
          <button class="btn btn-secondary" id="btn-test">Take a Test</button>
          <button class="btn btn-ghost" id="btn-review">Review Weak Keys</button>
        </div>
      </div>
      ${weak.length ? `
      <div class="card">
        <div class="card-title">Weakest Keys</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
          ${weak.map(k => `<span style="background:var(--bg-hover);padding:6px 14px;border-radius:6px;font-family:var(--mono)">${k.key.toUpperCase()} — ${k.masteryScore}%</span>`).join('')}
        </div>
      </div>` : ''}
    `;
  }

  private viewLearn(): string {
    const levels = [...new Set(this.lessons.map(l => l.level))];
    let html = '';
    for (const level of levels) {
      const list = this.lessons.filter(l => l.level === level);
      html += `<div class="level-header">${level}</div><div class="lesson-list">`;
      for (const lesson of list) {
        const prog = this.progress.lessons[lesson.id];
        const completed = prog?.completed;
        const locked = lesson.id > 1 && !this.progress.lessons[lesson.id - 1]?.completed && lesson.difficulty > 1 && !completed;
        html += `
          <div class="lesson-item ${completed ? 'completed' : ''} ${locked ? 'locked' : ''}" data-id="${lesson.id}">
            <div class="lesson-num">${completed ? '✓' : lesson.number}</div>
            <div class="lesson-info">
              <h3>${lesson.title}</h3>
              <p>${lesson.description}</p>
            </div>
          </div>`;
      }
      html += '</div>';
    }
    return html;
  }

  private bindLearn() {
    document.querySelectorAll('.lesson-item:not(.locked)').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id;
        this.router.navigate(`lesson/${id}`);
      });
    });
    // Dashboard buttons if present
    document.getElementById('btn-continue')?.addEventListener('click', () => {
      this.router.navigate(`lesson/${this.progress.currentLessonId}`);
    });
    document.getElementById('btn-practice')?.addEventListener('click', () => this.router.navigate('practice'));
    document.getElementById('btn-test')?.addEventListener('click', () => this.router.navigate('test'));
    document.getElementById('btn-review')?.addEventListener('click', () => this.router.navigate('review'));
  }

  private viewLesson(id: number): string {
    const lesson = getLessonById(this.lessons, id);
    if (!lesson) return '<p>Lesson not found.</p>';
    return `
      <div class="typing-container">
        <div style="margin-bottom:16px">
          <h2 style="font-size:1.2rem">${lesson.title}</h2>
          <p style="color:var(--text-muted);font-size:0.9rem">${lesson.description}</p>
        </div>
        <div class="progress-bar" style="margin-bottom:16px"><div class="progress-bar-fill" id="lesson-progress" style="width:0%"></div></div>
        <div class="metrics-bar" id="metrics">
          <div class="metric"><div class="metric-label">WPM</div><div class="metric-value" id="m-wpm">0</div></div>
          <div class="metric"><div class="metric-label">Accuracy</div><div class="metric-value" id="m-acc">100%</div></div>
          <div class="metric"><div class="metric-label">Errors</div><div class="metric-value" id="m-err">0</div></div>
          <div class="metric"><div class="metric-label">Time</div><div class="metric-value" id="m-time">0:00</div></div>
        </div>
        <div class="typing-text" id="typing-text" tabindex="0"></div>
        <div class="finger-guide" id="finger-guide"></div>
        <div class="keyboard" id="keyboard"></div>
        <div style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-start">Start Lesson</button>
          <button class="btn btn-secondary" id="btn-pause" style="display:none">Pause</button>
          <button class="btn btn-ghost" id="btn-restart">Restart</button>
        </div>
      </div>
    `;
  }

  private bindLesson(id: number) {
    const lesson = getLessonById(this.lessons, id);
    if (!lesson) return;
    let exerciseIdx = 0;
    const exercises = lesson.exercises;
    let text = exercises[0]?.text || '';

    this.engine.setText(text);
    this.engine.setAllowBackspace(this.progress.settings.backspaceAllowed);
    this.renderTypingText();
    this.renderKeyboard();
    this.updateFingerGuide(text[0] || '');

    const startBtn = document.getElementById('btn-start')!;
    const pauseBtn = document.getElementById('btn-pause')!;

    startBtn.addEventListener('click', () => {
      this.audio.playStart();
      this.engine.start();
      startBtn.style.display = 'none';
      pauseBtn.style.display = '';
      document.getElementById('typing-text')?.focus();
      this.bindTyping();
    });

    pauseBtn.addEventListener('click', () => {
      if (this.engine.getIsPaused()) {
        this.engine.resume();
        pauseBtn.textContent = 'Pause';
        this.bindTyping();
      } else {
        this.engine.pause();
        pauseBtn.textContent = 'Resume';
        this.unbindTyping();
      }
    });

    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.unbindTyping();
      exerciseIdx = 0;
      text = exercises[0]?.text || '';
      this.engine.setText(text);
      this.engine.reset();
      this.renderTypingText();
      this.renderKeyboard();
      this.updateFingerGuide(text[0] || '');
      startBtn.style.display = '';
      pauseBtn.style.display = 'none';
      pauseBtn.textContent = 'Pause';
      this.updateMetricsDisplay({ wpm: 0, accuracy: 100, errors: 0, elapsedMs: 0, progress: 0 } as any);
    });

    this.engine.onKeyPress((info) => {
      if (info.correct) this.audio.playKeyCorrect();
      else this.audio.playKeyError();
      this.storage.updateKeyStats(info.expected, info.correct, 100);
      this.renderTypingText();
      this.highlightKey(info.expected, info.correct);
      const next = this.engine.getTarget()[this.engine.getPosition()];
      this.updateFingerGuide(next || '');
    });

    this.engine.onMetricsUpdate((m) => {
      this.updateMetricsDisplay(m);
      const fill = document.getElementById('lesson-progress');
      if (fill) fill.style.width = m.progress + '%';
    });

    this.engine.onFinished(async (m) => {
      this.unbindTyping();
      this.audio.playComplete();
      const passed = m.accuracy >= (lesson.requirements.accuracy || 90);

      await this.storage.addLessonResult({
        lessonId: id,
        timestamp: Date.now(),
        wpm: m.wpm,
        accuracy: m.accuracy,
        errors: m.errors,
        duration: m.elapsedMs,
        completed: passed
      });

      const existing = this.progress.lessons[id] || {
        lessonId: id, completed: false, attempts: 0,
        bestAccuracy: 0, bestWpm: 0, lastAttempt: 0, timesCompleted: 0
      };
      existing.attempts++;
      existing.lastAttempt = Date.now();
      if (m.accuracy > existing.bestAccuracy) existing.bestAccuracy = m.accuracy;
      if (m.wpm > existing.bestWpm) existing.bestWpm = m.wpm;
      if (passed) {
        existing.completed = true;
        existing.timesCompleted++;
        if (id >= this.progress.currentLessonId) {
          this.progress.currentLessonId = Math.min(id + 1, this.lessons.length);
        }
      }
      this.progress.lessons[id] = existing;
      this.progress.totalPracticeTimeMs += m.elapsedMs;
      this.progress.totalKeystrokes += m.correctChars + m.incorrectChars;
      this.progress.totalCharacters += m.correctChars;
      this.progress.totalErrors += m.errors;
      if (m.wpm > this.progress.bestWpm) this.progress.bestWpm = m.wpm;
      this.updateStreak();
      this.recalcAverages();
      await this.storage.saveUserProgress(this.progress);
      await this.checkAchievements();

      if (passed && exerciseIdx < exercises.length - 1) {
        exerciseIdx++;
        text = exercises[exerciseIdx].text;
        this.engine.setText(text);
        this.engine.reset();
        this.renderTypingText();
        this.renderKeyboard();
        this.updateFingerGuide(text[0] || '');
        startBtn.style.display = '';
        pauseBtn.style.display = 'none';
        this.toast(`Exercise ${exerciseIdx + 1}/${exercises.length}`, 'success');
      } else {
        this.showLessonResult(m, passed, lesson);
      }
    });
  }

  private showLessonResult(m: any, passed: boolean, lesson: Lesson) {
    const content = document.getElementById('content')!;
    content.innerHTML = `
      <div class="result-screen">
        <h2>${passed ? 'Lesson Complete!' : 'Keep Practicing'}</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">${passed ? 'Great work!' : `Need ${lesson.requirements.accuracy}% accuracy to pass.`}</p>
        <div class="result-stats">
          <div class="result-stat"><div class="val">${m.wpm}</div><div class="lbl">WPM</div></div>
          <div class="result-stat"><div class="val">${m.accuracy}%</div><div class="lbl">Accuracy</div></div>
          <div class="result-stat"><div class="val">${m.errors}</div><div class="lbl">Errors</div></div>
          <div class="result-stat"><div class="val">${m.netWpm}</div><div class="lbl">Net WPM</div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="res-again">Try Again</button>
          ${passed ? `<button class="btn btn-accent" id="res-next">Next Lesson</button>` : ''}
          <button class="btn btn-secondary" id="res-dash">Dashboard</button>
        </div>
      </div>
    `;
    document.getElementById('res-again')?.addEventListener('click', () => this.router.navigate(`lesson/${lesson.id}`));
    document.getElementById('res-next')?.addEventListener('click', () => this.router.navigate(`lesson/${lesson.id + 1}`));
    document.getElementById('res-dash')?.addEventListener('click', () => this.router.navigate('dashboard'));
  }

  private viewPractice(): string {
    return `
      <div class="typing-container">
        <p style="color:var(--text-muted);margin-bottom:16px">Free practice — type the text below. Focus on accuracy.</p>
        <div class="metrics-bar">
          <div class="metric"><div class="metric-label">WPM</div><div class="metric-value" id="m-wpm">0</div></div>
          <div class="metric"><div class="metric-label">Accuracy</div><div class="metric-value" id="m-acc">100%</div></div>
          <div class="metric"><div class="metric-label">Errors</div><div class="metric-value" id="m-err">0</div></div>
        </div>
        <div class="typing-text" id="typing-text" tabindex="0"></div>
        <div class="keyboard" id="keyboard"></div>
        <div style="text-align:center;margin-top:20px">
          <button class="btn btn-primary" id="btn-start">Start Practice</button>
          <button class="btn btn-ghost" id="btn-new">New Text</button>
        </div>
      </div>
    `;
  }

  private bindPractice() {
    const samples = [
      'the quick brown fox jumps over the lazy dog',
      'practice makes progress every single day',
      'typing master helps you build muscle memory',
      'accuracy first then speed will follow naturally',
      'keep your fingers on the home row keys always'
    ];
    let text = samples[Math.floor(Math.random() * samples.length)];
    this.engine.setText(text);
    this.renderTypingText();
    this.renderKeyboard();

    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.audio.playStart();
      this.engine.start();
      this.bindTyping();
      document.getElementById('typing-text')?.focus();
    });
    document.getElementById('btn-new')!.addEventListener('click', () => {
      this.unbindTyping();
      text = samples[Math.floor(Math.random() * samples.length)];
      this.engine.setText(text);
      this.engine.reset();
      this.renderTypingText();
    });
    this.engine.onKeyPress((info) => {
      if (info.correct) this.audio.playKeyCorrect(); else this.audio.playKeyError();
      this.renderTypingText();
      this.highlightKey(info.expected, info.correct);
    });
    this.engine.onMetricsUpdate((m) => this.updateMetricsDisplay(m));
    this.engine.onFinished((m) => {
      this.unbindTyping();
      this.audio.playComplete();
      this.toast(`Done! ${m.wpm} WPM, ${m.accuracy}% accuracy`, 'success');
    });
  }

  private viewTest(): string {
    return `
      <div class="typing-container">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;justify-content:center">
          <label>Duration:
            <select id="test-duration">
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
              <option value="60" selected>1 min</option>
              <option value="120">2 min</option>
              <option value="300">5 min</option>
            </select>
          </label>
          <label>Mode:
            <select id="test-mode">
              <option value="words">Words</option>
              <option value="quotes">Quotes</option>
              <option value="paragraph">Paragraph</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>
        <div class="metrics-bar">
          <div class="metric"><div class="metric-label">WPM</div><div class="metric-value" id="m-wpm">0</div></div>
          <div class="metric"><div class="metric-label">Accuracy</div><div class="metric-value" id="m-acc">100%</div></div>
          <div class="metric"><div class="metric-label">Time Left</div><div class="metric-value" id="m-time">1:00</div></div>
        </div>
        <div class="typing-text" id="typing-text" tabindex="0"></div>
        <div style="text-align:center;margin-top:20px">
          <button class="btn btn-primary btn-lg" id="btn-start-test">Start Test</button>
        </div>
      </div>
    `;
  }

  private bindTest() {
    const wordBank = ['the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us'];
    let timer: number | null = null;
    let remaining = 60;

    const genText = () => {
      const mode = (document.getElementById('test-mode') as HTMLSelectElement).value;
      if (mode === 'quotes') return 'The only way to learn to type well is through consistent deliberate practice every single day.';
      if (mode === 'paragraph') return 'Typing is a fundamental skill in the modern world. Whether you write emails, code software, or create documents, the ability to type quickly and accurately saves time and reduces frustration. Touch typing allows you to focus on ideas rather than finding keys.';
      let t = '';
      for (let i = 0; i < 80; i++) t += wordBank[Math.floor(Math.random() * wordBank.length)] + ' ';
      return t.trim();
    };

    document.getElementById('btn-start-test')!.addEventListener('click', () => {
      const dur = parseInt((document.getElementById('test-duration') as HTMLSelectElement).value, 10);
      remaining = dur;
      const text = genText();
      this.engine.setText(text);
      this.engine.reset();
      this.renderTypingText();
      this.audio.playStart();
      this.engine.start();
      this.bindTyping();
      document.getElementById('typing-text')?.focus();
      document.getElementById('btn-start-test')!.style.display = 'none';

      timer = window.setInterval(() => {
        remaining--;
        const el = document.getElementById('m-time');
        if (el) el.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
        if (remaining <= 0) {
          if (timer) clearInterval(timer);
          this.finishTest();
        }
      }, 1000);
    });

    this.engine.onKeyPress((info) => {
      if (info.correct) this.audio.playKeyCorrect(); else this.audio.playKeyError();
      this.renderTypingText();
    });
    this.engine.onMetricsUpdate((m) => {
      const w = document.getElementById('m-wpm');
      const a = document.getElementById('m-acc');
      if (w) w.textContent = String(m.wpm);
      if (a) a.textContent = m.accuracy + '%';
    });
  }

  private async finishTest() {
    this.unbindTyping();
    this.engine.pause();
    const m = this.engine.getMetrics();
    this.audio.playComplete();
    const result = {
      id: Date.now().toString(36),
      timestamp: Date.now(),
      duration: m.elapsedMs,
      mode: 'standard',
      wpm: m.wpm,
      netWpm: m.netWpm,
      accuracy: m.accuracy,
      errors: m.errors,
      correctChars: m.correctChars,
      incorrectChars: m.incorrectChars,
      totalChars: m.correctChars + m.incorrectChars
    };
    await this.storage.addTestResult(result);
    this.progress = await this.storage.loadUserProgress();
    if (m.wpm > this.progress.bestWpm) {
      this.progress.bestWpm = m.wpm;
      await this.storage.saveUserProgress(this.progress);
    }
    await this.checkAchievements();

    const content = document.getElementById('content')!;
    content.innerHTML = `
      <div class="result-screen">
        <h2>Test Complete</h2>
        <div class="result-stats">
          <div class="result-stat"><div class="val">${m.wpm}</div><div class="lbl">WPM</div></div>
          <div class="result-stat"><div class="val">${m.accuracy}%</div><div class="lbl">Accuracy</div></div>
          <div class="result-stat"><div class="val">${m.errors}</div><div class="lbl">Errors</div></div>
          <div class="result-stat"><div class="val">${m.netWpm}</div><div class="lbl">Net WPM</div></div>
        </div>
        <p style="color:var(--text-muted);margin-bottom:16px">Personal best: ${this.progress.bestWpm} WPM</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary" id="test-again">Try Again</button>
          <button class="btn btn-secondary" id="test-dash">Dashboard</button>
        </div>
      </div>
    `;
    document.getElementById('test-again')?.addEventListener('click', () => this.router.navigate('test'));
    document.getElementById('test-dash')?.addEventListener('click', () => this.router.navigate('dashboard'));
  }

  private viewGames(): string {
    return `
      <div class="grid grid-3">
        <div class="card" style="cursor:pointer" id="game-rush">
          <h3 style="margin-bottom:8px">Key Rush</h3>
          <p style="color:var(--text-muted);font-size:0.9rem">Type characters before the timer runs out. Build combos for higher scores.</p>
        </div>
        <div class="card" style="cursor:pointer" id="game-fall">
          <h3 style="margin-bottom:8px">Word Fall</h3>
          <p style="color:var(--text-muted);font-size:0.9rem">Words fall from the top. Type them before they reach the bottom.</p>
        </div>
        <div class="card" style="cursor:pointer" id="game-run">
          <h3 style="margin-bottom:8px">Typing Run</h3>
          <p style="color:var(--text-muted);font-size:0.9rem">Race forward by typing correctly. Mistakes slow you down.</p>
        </div>
      </div>
      <div id="game-container" style="margin-top:24px"></div>
    `;
  }

  private bindGames() {
    document.getElementById('game-rush')?.addEventListener('click', () => this.startKeyRush());
    document.getElementById('game-fall')?.addEventListener('click', () => this.startWordFall());
    document.getElementById('game-run')?.addEventListener('click', () => this.startTypingRun());
  }

  private startKeyRush() {
    const container = document.getElementById('game-container')!;
    let score = 0, combo = 0, lives = 3, char = '', timeLeft = 3;
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const next = () => { char = chars[Math.floor(Math.random() * chars.length)]; timeLeft = Math.max(1.2, 3 - score * 0.02); };
    next();
    container.innerHTML = `
      <div class="game-area" style="padding:40px;text-align:center">
        <div style="font-size:0.9rem;color:var(--text-muted)">Score: <span id="g-score">0</span> | Combo: <span id="g-combo">0</span> | Lives: <span id="g-lives">3</span></div>
        <div style="font-size:4rem;font-weight:700;margin:40px 0;font-family:var(--mono)" id="g-char">${char}</div>
        <div class="progress-bar" style="max-width:200px;margin:0 auto"><div class="progress-bar-fill" id="g-timer" style="width:100%"></div></div>
        <p style="margin-top:20px;color:var(--text-muted)">Type the letter shown</p>
      </div>
    `;
    let interval = setInterval(() => {
      timeLeft -= 0.05;
      const pct = Math.max(0, (timeLeft / 3) * 100);
      const bar = document.getElementById('g-timer');
      if (bar) bar.style.width = pct + '%';
      if (timeLeft <= 0) {
        lives--;
        combo = 0;
        document.getElementById('g-lives')!.textContent = String(lives);
        if (lives <= 0) {
          clearInterval(interval);
          this.audio.playGameFailure();
          container.innerHTML = `<div class="game-area" style="padding:40px;text-align:center"><h2>Game Over</h2><p>Score: ${score}</p><button class="btn btn-primary" style="margin-top:16px" onclick="location.hash='#games'">Back</button></div>`;
          this.storage.addGameScore({ game: 'key-rush', score, timestamp: Date.now(), level: 1 });
          return;
        }
        next();
        document.getElementById('g-char')!.textContent = char;
      }
    }, 50);

    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === char) {
        score += 10 + combo * 2;
        combo++;
        this.audio.playKeyCorrect();
        next();
        document.getElementById('g-char')!.textContent = char;
        document.getElementById('g-score')!.textContent = String(score);
        document.getElementById('g-combo')!.textContent = String(combo);
      } else if (e.key.length === 1) {
        combo = 0;
        this.audio.playKeyError();
        document.getElementById('g-combo')!.textContent = '0';
      }
    };
    window.addEventListener('keydown', handler);
    // cleanup when navigating away is handled by unbind on route change roughly
    (container as any)._cleanup = () => { clearInterval(interval); window.removeEventListener('keydown', handler); };
  }

  private startWordFall() {
    const container = document.getElementById('game-container')!;
    const words = ['type','fast','code','learn','skill','focus','speed','words','master','practice','keyboard','finger','home','row','shift'];
    let score = 0, lives = 3, current = words[0], input = '';
    container.innerHTML = `
      <div class="game-area" style="padding:30px;text-align:center">
        <div style="font-size:0.9rem;color:var(--text-muted)">Score: <span id="g-score">0</span> | Lives: <span id="g-lives">3</span></div>
        <div style="font-size:2rem;font-weight:700;margin:50px 0;font-family:var(--mono)" id="g-word">${current}</div>
        <div style="font-family:var(--mono);font-size:1.2rem;color:var(--primary)" id="g-input"></div>
        <p style="margin-top:20px;color:var(--text-muted)">Type the word</p>
      </div>
    `;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') { input = input.slice(0, -1); }
      else if (e.key.length === 1) { input += e.key.toLowerCase(); }
      document.getElementById('g-input')!.textContent = input;
      if (input === current) {
        score += current.length * 10;
        this.audio.playKeyCorrect();
        current = words[Math.floor(Math.random() * words.length)];
        input = '';
        document.getElementById('g-word')!.textContent = current;
        document.getElementById('g-input')!.textContent = '';
        document.getElementById('g-score')!.textContent = String(score);
      } else if (input.length >= current.length) {
        lives--;
        this.audio.playKeyError();
        input = '';
        current = words[Math.floor(Math.random() * words.length)];
        document.getElementById('g-word')!.textContent = current;
        document.getElementById('g-input')!.textContent = '';
        document.getElementById('g-lives')!.textContent = String(lives);
        if (lives <= 0) {
          window.removeEventListener('keydown', handler);
          this.audio.playGameFailure();
          container.innerHTML = `<div class="game-area" style="padding:40px;text-align:center"><h2>Game Over</h2><p>Score: ${score}</p><button class="btn btn-primary" style="margin-top:16px" onclick="location.hash='#games'">Back</button></div>`;
          this.storage.addGameScore({ game: 'word-fall', score, timestamp: Date.now(), level: 1 });
        }
      }
    };
    window.addEventListener('keydown', handler);
  }

  private startTypingRun() {
    const container = document.getElementById('game-container')!;
    const text = 'the quick brown fox jumps over the lazy dog and then runs around the track as fast as possible';
    let pos = 0, distance = 0;
    container.innerHTML = `
      <div class="game-area" style="padding:30px">
        <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:16px">Distance: <span id="g-dist">0</span>m</div>
        <div style="height:8px;background:var(--bg-hover);border-radius:4px;margin-bottom:24px">
          <div id="g-track" style="height:100%;width:0%;background:var(--primary);border-radius:4px;transition:width 0.1s"></div>
        </div>
        <div class="typing-text" id="g-text" style="font-size:1.2rem"></div>
      </div>
    `;
    const render = () => {
      const el = document.getElementById('g-text')!;
      el.innerHTML = text.split('').map((c, i) => {
        if (i < pos) return `<span class="char correct">${c === ' ' ? '·' : c}</span>`;
        if (i === pos) return `<span class="char current">${c === ' ' ? '·' : c}</span>`;
        return `<span class="char pending">${c === ' ' ? '·' : c}</span>`;
      }).join('');
    };
    render();
    const handler = (e: KeyboardEvent) => {
      if (e.key === text[pos]) {
        pos++;
        distance += 2;
        this.audio.playKeyCorrect();
        document.getElementById('g-dist')!.textContent = String(distance);
        document.getElementById('g-track')!.style.width = Math.min(100, (pos / text.length) * 100) + '%';
        if (pos >= text.length) {
          window.removeEventListener('keydown', handler);
          this.audio.playGameSuccess();
          container.innerHTML = `<div class="game-area" style="padding:40px;text-align:center"><h2>Finish!</h2><p>Distance: ${distance}m</p><button class="btn btn-primary" style="margin-top:16px" onclick="location.hash='#games'">Back</button></div>`;
          this.storage.addGameScore({ game: 'typing-run', score: distance, timestamp: Date.now(), level: 1 });
        } else render();
      } else if (e.key.length === 1) {
        this.audio.playKeyError();
      }
    };
    window.addEventListener('keydown', handler);
  }

  private viewReview(): string {
    const weak = this.getWeakKeys(10);
    if (!weak.length) {
      return `<div class="card"><p>No weak keys detected yet. Complete more lessons to get personalized review drills.</p>
        <button class="btn btn-primary" style="margin-top:12px" id="btn-go-learn">Go to Learn</button></div>`;
    }
    const drill = weak.map(k => k.key).join(' ').repeat(4);
    return `
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Your Weakest Keys</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
          ${weak.map(k => `<span style="background:var(--bg-hover);padding:6px 14px;border-radius:6px;font-family:var(--mono)">${k.key.toUpperCase()} — ${k.masteryScore}%</span>`).join('')}
        </div>
      </div>
      <div class="typing-container">
        <div class="metrics-bar">
          <div class="metric"><div class="metric-label">WPM</div><div class="metric-value" id="m-wpm">0</div></div>
          <div class="metric"><div class="metric-label">Accuracy</div><div class="metric-value" id="m-acc">100%</div></div>
        </div>
        <div class="typing-text" id="typing-text" tabindex="0"></div>
        <div style="text-align:center;margin-top:16px">
          <button class="btn btn-primary" id="btn-start">Start Review Drill</button>
        </div>
      </div>
    `;
  }

  private bindReview() {
    document.getElementById('btn-go-learn')?.addEventListener('click', () => this.router.navigate('learn'));
    const weak = this.getWeakKeys(8);
    if (!weak.length) return;
    const keys = weak.map(k => k.key);
    let text = '';
    for (let i = 0; i < 40; i++) text += keys[Math.floor(Math.random() * keys.length)] + (i % 5 === 4 ? ' ' : '');
    this.engine.setText(text.trim());
    this.renderTypingText();
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.engine.start();
      this.bindTyping();
      document.getElementById('typing-text')?.focus();
    });
    this.engine.onKeyPress((info) => {
      if (info.correct) this.audio.playKeyCorrect(); else this.audio.playKeyError();
      this.storage.updateKeyStats(info.expected, info.correct, 80);
      this.renderTypingText();
    });
    this.engine.onMetricsUpdate((m) => this.updateMetricsDisplay(m));
    this.engine.onFinished(() => {
      this.unbindTyping();
      this.audio.playComplete();
      this.toast('Review drill complete!', 'success');
    });
  }

  private viewStatistics(): string {
    const p = this.progress;
    const tests = p.testResults.slice(0, 10);
    return `
      <div class="grid grid-3" style="margin-bottom:24px">
        <div class="card"><div class="card-title">Total Practice</div><div class="card-value">${Math.round(p.totalPracticeTimeMs / 60000)} min</div></div>
        <div class="card"><div class="card-title">Keystrokes</div><div class="card-value">${p.totalKeystrokes.toLocaleString()}</div></div>
        <div class="card"><div class="card-title">Total Errors</div><div class="card-value">${p.totalErrors}</div></div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Recent Tests</div>
        ${tests.length ? `<table style="width:100%;margin-top:12px;font-size:0.9rem">
          <tr style="color:var(--text-muted);text-align:left"><th style="padding:6px 0">Date</th><th>WPM</th><th>Accuracy</th><th>Errors</th></tr>
          ${tests.map(t => `<tr><td style="padding:6px 0">${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.wpm}</td><td>${t.accuracy}%</td><td>${t.errors}</td></tr>`).join('')}
        </table>` : '<p style="color:var(--text-muted);margin-top:8px">No tests yet.</p>'}
      </div>
      <div class="card">
        <div class="card-title">Key Mastery</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          ${Object.values(p.keyStats).sort((a,b) => a.masteryScore - b.masteryScore).slice(0, 20).map(k =>
            `<span style="background:var(--bg-hover);padding:4px 10px;border-radius:4px;font-family:var(--mono);font-size:0.85rem">${k.key.toUpperCase()} ${k.masteryScore}%</span>`
          ).join('') || '<span style="color:var(--text-muted)">Practice more to see key stats.</span>'}
        </div>
      </div>
    `;
  }

  private viewAchievements(): string {
    const list = Object.values(this.progress.achievements);
    return `<div class="achievement-grid">
      ${list.map(a => `
        <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="icon">${a.icon}</div>
          <h4>${a.title}</h4>
          <p>${a.description}</p>
          ${a.unlocked && a.unlockedAt ? `<p style="font-size:0.7rem;margin-top:6px">${new Date(a.unlockedAt).toLocaleDateString()}</p>` : ''}
        </div>
      `).join('')}
    </div>`;
  }

  private viewKeyboard(): string {
    return `
      <div class="card" style="margin-bottom:20px">
        <p style="color:var(--text-muted);margin-bottom:16px">US QWERTY layout. Home row keys are marked. Place index fingers on F and J (the keys with bumps).</p>
        <div class="keyboard" id="keyboard"></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Left Hand</div>
          <p style="font-size:0.9rem;margin-top:8px">Pinky: Q A Z 1<br>Ring: W S X 2<br>Middle: E D C 3<br>Index: R T F G V B 4 5</p>
        </div>
        <div class="card">
          <div class="card-title">Right Hand</div>
          <p style="font-size:0.9rem;margin-top:8px">Index: Y U H J N M 6 7<br>Middle: I K , 8<br>Ring: O L . 9<br>Pinky: P ; / 0 - =</p>
        </div>
      </div>
    `;
  }

  private viewSettings(): string {
    const s = this.progress.settings;
    return `
      <div class="settings-group">
        <h3>Appearance</h3>
        <div class="setting-row"><label>Theme</label>
          <select id="set-theme"><option value="dark" ${s.theme==='dark'?'selected':''}>Dark</option><option value="light" ${s.theme==='light'?'selected':''}>Light</option><option value="system" ${s.theme==='system'?'selected':''}>System</option></select>
        </div>
      </div>
      <div class="settings-group">
        <h3>Sound</h3>
        <div class="setting-row"><label>Sound Effects</label><div class="toggle ${s.soundEffects?'on':''}" id="set-sfx" data-key="soundEffects"></div></div>
        <div class="setting-row"><label>Typing Sounds</label><div class="toggle ${s.typingSounds?'on':''}" id="set-typing" data-key="typingSounds"></div></div>
        <div class="setting-row"><label>Volume</label><input type="range" id="set-vol" min="0" max="100" value="${s.masterVolume*100}"></div>
      </div>
      <div class="settings-group">
        <h3>Display</h3>
        <div class="setting-row"><label>Show Keyboard</label><div class="toggle ${s.showKeyboard?'on':''}" data-key="showKeyboard"></div></div>
        <div class="setting-row"><label>Show Finger Guide</label><div class="toggle ${s.showFingerGuide?'on':''}" data-key="showFingerGuide"></div></div>
        <div class="setting-row"><label>Allow Backspace</label><div class="toggle ${s.backspaceAllowed?'on':''}" data-key="backspaceAllowed"></div></div>
      </div>
      <div class="settings-group">
        <h3>Data</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
          <button class="btn btn-secondary" id="btn-export">Export Progress</button>
          <button class="btn btn-secondary" id="btn-import">Import Progress</button>
          <button class="btn btn-ghost" id="btn-reset" style="color:var(--error)">Reset All Data</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    `;
  }

  private bindSettings() {
    document.getElementById('set-theme')?.addEventListener('change', async (e) => {
      this.progress.settings.theme = (e.target as HTMLSelectElement).value as any;
      await this.storage.saveUserProgress(this.progress);
      this.applyTheme();
    });
    document.querySelectorAll('.toggle').forEach(el => {
      el.addEventListener('click', async () => {
        const key = (el as HTMLElement).dataset.key as keyof typeof this.progress.settings;
        if (!key) return;
        (this.progress.settings as any)[key] = !(this.progress.settings as any)[key];
        el.classList.toggle('on');
        this.audio.setEnabled(this.progress.settings.soundEffects);
        this.audio.setTypingEnabled(this.progress.settings.typingSounds);
        await this.storage.saveUserProgress(this.progress);
      });
    });
    document.getElementById('set-vol')?.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      this.progress.settings.masterVolume = v;
      this.audio.setVolume(v);
      this.storage.saveUserProgress(this.progress);
    });
    document.getElementById('btn-export')?.addEventListener('click', async () => {
      const json = await this.storage.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'typing-master-progress.json';
      a.click();
      this.toast('Progress exported', 'success');
    });
    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });
    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const ok = await this.storage.importData(text);
      if (ok) {
        this.progress = await this.storage.loadUserProgress();
        this.applyTheme();
        this.toast('Progress imported', 'success');
        this.router.navigate('dashboard');
      } else {
        this.toast('Invalid progress file', 'error');
      }
    });
    document.getElementById('btn-reset')?.addEventListener('click', async () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        await this.storage.resetAllData();
        this.progress = await this.storage.loadUserProgress();
        this.toast('All data reset', 'success');
        this.router.navigate('onboarding');
      }
    });
  }

  private viewAbout(): string {
    return `
      <div class="card" style="max-width:600px">
        <h2 style="margin-bottom:12px">Typing Master</h2>
        <p style="color:var(--text-muted);margin-bottom:16px"><em>Build Speed. Build Accuracy. Build Muscle Memory.</em></p>
        <p style="margin-bottom:12px">A professional touch-typing tutor designed for Windows PCs and desktop browsers. Learn from complete beginner to advanced typist with 125 progressive lessons.</p>
        <h3 style="margin:16px 0 8px;font-size:1rem">Privacy</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">All progress is stored locally on your device using IndexedDB and LocalStorage. Nothing is uploaded. No accounts, no tracking, no ads.</p>
        <h3 style="margin:16px 0 8px;font-size:1rem">WPM Calculation</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">Gross WPM = (characters typed / 5) / minutes. Net WPM accounts for errors. Standard 5 characters = 1 word.</p>
        <h3 style="margin:16px 0 8px;font-size:1rem">Offline</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">This app works offline after the first load via service worker caching.</p>
        <p style="margin-top:20px;font-size:0.8rem;color:var(--text-dim)">Version 1.0.0 · English only · US QWERTY</p>
      </div>
    `;
  }

  private viewOnboarding(): string {
    return `
      <div class="onboarding">
        <h2>Welcome to Typing Master</h2>
        <p>Let's personalize your training. No account needed.</p>
        <div id="ob-step1">
          <h3 style="margin-bottom:12px">Your experience level</h3>
          <div class="onboarding-options">
            <div class="onboarding-opt" data-val="complete-beginner"><h3>Complete Beginner</h3><p>Never learned touch typing</p></div>
            <div class="onboarding-opt" data-val="beginner"><h3>Beginner</h3><p>Know the home row basics</p></div>
            <div class="onboarding-opt" data-val="intermediate"><h3>Intermediate</h3><p>Can type but want to improve</p></div>
            <div class="onboarding-opt" data-val="advanced"><h3>Advanced</h3><p>Focus on speed and accuracy</p></div>
          </div>
        </div>
        <div id="ob-step2" style="display:none">
          <h3 style="margin-bottom:12px">Your focus</h3>
          <div class="onboarding-options">
            <div class="onboarding-opt" data-val="accuracy"><h3>Accuracy</h3><p>Fewer mistakes first</p></div>
            <div class="onboarding-opt" data-val="speed"><h3>Speed</h3><p>Type faster</p></div>
            <div class="onboarding-opt" data-val="both"><h3>Both</h3><p>Balanced training</p></div>
          </div>
        </div>
        <div id="ob-step3" style="display:none">
          <h3 style="margin-bottom:12px">Keyboard layout</h3>
          <div class="onboarding-options">
            <div class="onboarding-opt selected" data-val="us-qwerty"><h3>US QWERTY</h3><p>Standard Windows keyboard</p></div>
          </div>
          <button class="btn btn-primary btn-lg" id="ob-start" style="margin-top:20px">Start My Training</button>
        </div>
      </div>
    `;
  }

  private bindOnboarding() {
    let level = 'complete-beginner';
    let focus = 'both';
    document.querySelectorAll('#ob-step1 .onboarding-opt').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#ob-step1 .onboarding-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        level = (el as HTMLElement).dataset.val!;
        (document.getElementById('ob-step1') as HTMLElement).style.display = 'none';
        (document.getElementById('ob-step2') as HTMLElement).style.display = '';
      });
    });
    document.querySelectorAll('#ob-step2 .onboarding-opt').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#ob-step2 .onboarding-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        focus = (el as HTMLElement).dataset.val!;
        (document.getElementById('ob-step2') as HTMLElement).style.display = 'none';
        (document.getElementById('ob-step3') as HTMLElement).style.display = '';
      });
    });
    document.getElementById('ob-start')?.addEventListener('click', async () => {
      this.progress.firstLaunch = false;
      this.progress.experienceLevel = level as any;
      this.progress.focusGoal = focus as any;
      if (level === 'intermediate') this.progress.currentLessonId = 26;
      if (level === 'advanced') this.progress.currentLessonId = 56;
      await this.storage.saveUserProgress(this.progress);
      this.audio.playStart();
      this.router.navigate('dashboard');
    });
  }

  // ========== HELPERS ==========

  private renderTypingText() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const states = this.engine.getDisplayState();
    el.innerHTML = states.map(s => {
      const display = s.char === ' ' ? '·' : s.char;
      return `<span class="char ${s.state}">${display}</span>`;
    }).join('');
  }

  private renderKeyboard() {
    const el = document.getElementById('keyboard');
    if (!el) return;
    const rows = [
      ['`','1','2','3','4','5','6','7','8','9','0','-','='],
      ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
      ['a','s','d','f','g','h','j','k','l',';',"'"],
      ['z','x','c','v','b','n','m',',','.','/'],
      [' ']
    ];
    const home = new Set(['a','s','d','f','j','k','l',';']);
    el.innerHTML = rows.map((row, ri) => {
      return `<div class="kb-row">${row.map(k => {
        const cls = ['kb-key'];
        if (k === ' ') cls.push('space');
        if (home.has(k)) cls.push('home');
        return `<div class="${cls.join(' ')}" data-key="${k}">${k === ' ' ? 'Space' : k.toUpperCase()}</div>`;
      }).join('')}</div>`;
    }).join('');
  }

  private highlightKey(key: string, correct: boolean) {
    document.querySelectorAll('.kb-key').forEach(el => el.classList.remove('current', 'correct', 'error'));
    const k = key.toLowerCase();
    const el = document.querySelector(`.kb-key[data-key="${k}"]`);
    if (el) {
      el.classList.add(correct ? 'correct' : 'error');
      setTimeout(() => el.classList.remove('correct', 'error'), 200);
    }
    const next = this.engine.getTarget()[this.engine.getPosition()];
    if (next) {
      const n = document.querySelector(`.kb-key[data-key="${next.toLowerCase()}"]`);
      n?.classList.add('current');
    }
  }

  private updateFingerGuide(char: string) {
    const el = document.getElementById('finger-guide');
    if (!el || !this.progress.settings.showFingerGuide) {
      if (el) el.textContent = '';
      return;
    }
    if (!char) { el.textContent = ''; return; }
    const finger = FINGER_MAP[char.toLowerCase()] || FINGER_MAP[char] || '';
    const label = FINGER_LABELS[finger] || '';
    if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      const shiftSide = finger.startsWith('left') ? 'Right Pinky (Right Shift)' : 'Left Pinky (Left Shift)';
      el.innerHTML = `Use <strong>${label}</strong> for <strong>${char}</strong> + <strong>${shiftSide}</strong>`;
    } else {
      el.innerHTML = label ? `Use your <strong>${label}</strong>` : '';
    }
  }

  private updateMetricsDisplay(m: any) {
    const w = document.getElementById('m-wpm');
    const a = document.getElementById('m-acc');
    const e = document.getElementById('m-err');
    const t = document.getElementById('m-time');
    if (w) w.textContent = String(m.wpm || 0);
    if (a) a.textContent = (m.accuracy ?? 100) + '%';
    if (e) e.textContent = String(m.errors || 0);
    if (t && m.elapsedMs !== undefined) {
      const sec = Math.floor(m.elapsedMs / 1000);
      t.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }
  }

  private bindTyping() {
    this.unbindTyping();
    this.boundKeyHandler = (e: KeyboardEvent) => {
      this.engine.handleKeyDown(e);
    };
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  private unbindTyping() {
    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  private getWeakKeys(n: number) {
    return Object.values(this.progress.keyStats)
      .filter(k => k.attempts >= 3)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, n);
  }

  private updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.progress.lastPracticeDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (this.progress.lastPracticeDate === yesterday) {
      this.progress.currentStreak++;
    } else {
      this.progress.currentStreak = 1;
    }
    if (this.progress.currentStreak > this.progress.longestStreak) {
      this.progress.longestStreak = this.progress.currentStreak;
    }
    this.progress.lastPracticeDate = today;
  }

  private recalcAverages() {
    const results = this.progress.lessonResults;
    if (!results.length) return;
    const recent = results.slice(0, 20);
    this.progress.averageWpm = Math.round(recent.reduce((s, r) => s + r.wpm, 0) / recent.length);
    this.progress.averageAccuracy = Math.round(recent.reduce((s, r) => s + r.accuracy, 0) / recent.length);
  }

  private async checkAchievements() {
    const p = this.progress;
    const completed = Object.values(p.lessons).filter(l => l.completed).length;
    const checks: [string, boolean][] = [
      ['first-lesson', completed >= 1],
      ['lessons-10', completed >= 10],
      ['lessons-25', completed >= 25],
      ['lessons-50', completed >= 50],
      ['lessons-100', completed >= 100],
      ['wpm-50', p.bestWpm >= 50],
      ['wpm-60', p.bestWpm >= 60],
      ['wpm-80', p.bestWpm >= 80],
      ['wpm-100', p.bestWpm >= 100],
      ['chars-5k', p.totalCharacters >= 5000],
      ['chars-10k', p.totalCharacters >= 10000],
      ['time-1h', p.totalPracticeTimeMs >= 3600000],
      ['time-5h', p.totalPracticeTimeMs >= 18000000],
      ['streak-7', p.longestStreak >= 7],
      ['streak-30', p.longestStreak >= 30],
      ['complete-beginner', completed >= 10],
      ['master-typist', completed >= 100 && p.bestWpm >= 60],
    ];
    for (const [id, cond] of checks) {
      if (cond && !p.achievements[id]?.unlocked) {
        const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
        if (def) {
          const unlocked = await this.storage.unlockAchievement(id, { ...def, unlocked: false });
          if (unlocked) {
            this.progress.achievements[id] = { ...def, unlocked: true, unlockedAt: Date.now() };
            this.audio.playAchievement();
            this.toast(`Achievement unlocked: ${def.title}`, 'achievement');
          }
        }
      }
    }
  }

  private setupOfflineIndicator() {
    const badge = document.getElementById('offline-badge');
    const update = () => {
      if (!navigator.onLine) badge?.classList.add('show');
      else badge?.classList.remove('show');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.engine.getIsRunning()) {
          this.engine.pause();
          this.toast('Paused — press Escape or Resume', 'success');
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        this.progress.settings.showKeyboard = !this.progress.settings.showKeyboard;
        this.storage.saveUserProgress(this.progress);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        this.progress.settings.soundEffects = !this.progress.settings.soundEffects;
        this.audio.setEnabled(this.progress.settings.soundEffects);
        this.storage.saveUserProgress(this.progress);
        this.toast(`Sound ${this.progress.settings.soundEffects ? 'ON' : 'OFF'}`, 'success');
      }
    });
  }

  toast(msg: string, type: 'success' | 'error' | 'achievement' = 'success') {
    const container = document.getElementById('toasts');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}
