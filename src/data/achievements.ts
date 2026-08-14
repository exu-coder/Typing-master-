import { Achievement } from '../models/types';

export const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first-lesson', title: 'First Steps', description: 'Complete your first lesson', icon: '🎯' },
  { id: 'lessons-10', title: 'Getting Started', description: 'Complete 10 lessons', icon: '📚' },
  { id: 'lessons-25', title: 'Dedicated Learner', description: 'Complete 25 lessons', icon: '📖' },
  { id: 'lessons-50', title: 'Halfway There', description: 'Complete 50 lessons', icon: '⭐' },
  { id: 'lessons-100', title: 'Century Club', description: 'Complete 100 lessons', icon: '💯' },
  { id: 'wpm-50', title: 'Speed Starter', description: 'Reach 50 WPM', icon: '⚡' },
  { id: 'wpm-60', title: 'Swift Fingers', description: 'Reach 60 WPM', icon: '🚀' },
  { id: 'wpm-80', title: 'Speed Demon', description: 'Reach 80 WPM', icon: '💨' },
  { id: 'wpm-100', title: 'Century Speed', description: 'Reach 100 WPM', icon: '🏆' },
  { id: 'chars-5k', title: '5K Characters', description: 'Type 5,000 characters', icon: '✍️' },
  { id: 'chars-10k', title: '10K Characters', description: 'Type 10,000 characters', icon: '📝' },
  { id: 'time-1h', title: 'One Hour Club', description: 'Practice for 1 hour total', icon: '⏱️' },
  { id: 'time-5h', title: 'Dedicated', description: 'Practice for 5 hours total', icon: '🕐' },
  { id: 'streak-7', title: 'Week Warrior', description: '7-day practice streak', icon: '🔥' },
  { id: 'streak-30', title: 'Monthly Master', description: '30-day practice streak', icon: '🌟' },
  { id: 'complete-beginner', title: 'Foundation Complete', description: 'Finish the Foundation level', icon: '🏗️' },
  { id: 'master-typist', title: 'Master Typist', description: '100+ lessons and 60+ WPM', icon: '👑' },
  { id: 'perfect-accuracy', title: 'Perfect Accuracy', description: 'Complete a lesson with 100% accuracy', icon: '💎' },
  { id: 'no-mistakes', title: 'Flawless', description: 'Finish a test with zero errors', icon: '✨' },
];
