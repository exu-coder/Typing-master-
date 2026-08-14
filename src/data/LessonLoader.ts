import { Lesson } from '../models/types';

const PART_FILES = [
  'lesson-01-foundation.json',
  'lesson-02-basic-letters.json',
  'lesson-03-complete-alphabet.json',
  'lesson-04-common-words.json',
  'lesson-05-sentences.json',
  'lesson-06-shift-training.json',
  'lesson-07-number-row.json',
  'lesson-08-symbols.json',
  'lesson-09-advanced-combinations.json',
  'lesson-10-real-world.json'
];

export async function loadAllLessons(): Promise<Lesson[]> {
  const all: Lesson[] = [];
  for (const file of PART_FILES) {
    try {
      const res = await fetch(`./data/lessons/${file}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.lessons) all.push(...data.lessons);
      }
    } catch (e) {
      console.warn('Failed to load', file);
    }
  }
  if (all.length === 0) {
    try {
      const res = await fetch('./data/lessons.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch { /* ignore */ }
  }
  return all.sort((a, b) => a.id - b.id);
}

export function getLessonById(lessons: Lesson[], id: number): Lesson | undefined {
  return lessons.find(l => l.id === id);
}
