import { Flashcard, FlashcardDifficulty, FlashcardRating, FlashcardState } from '../../types/flashcard';

export interface SpacedRepetitionResult {
  state: FlashcardState;
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewedAt: string; // YYYY-MM-DD
}

export interface SpacedRepetitionStrategy {
  calculateNextReview(
    card: Pick<Flashcard, 'repetitionCount' | 'intervalDays' | 'easeFactor' | 'difficulty'>,
    rating: FlashcardRating,
    currentDate?: Date
  ): SpacedRepetitionResult;
}

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date offset by N days
 */
export function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * SM-2 Inspired Spaced Repetition Algorithm Implementation
 * Extensible and configurable for personalized learning curve
 */
export class SM2SpacedRepetitionStrategy implements SpacedRepetitionStrategy {
  private minEaseFactor: number;
  private maxIntervalDays: number;

  constructor(minEaseFactor = 1.3, maxIntervalDays = 365) {
    this.minEaseFactor = minEaseFactor;
    this.maxIntervalDays = maxIntervalDays;
  }

  /**
   * Difficulty weighting factor:
   * - 'easy': boost interval slightly (+15%)
   * - 'medium': default interval
   * - 'hard': conservative interval (-15%)
   */
  private getDifficultyMultiplier(diff?: FlashcardDifficulty): number {
    switch (diff) {
      case 'easy':
        return 1.15;
      case 'hard':
        return 0.85;
      case 'medium':
      default:
        return 1.0;
    }
  }

  calculateNextReview(
    card: Pick<Flashcard, 'repetitionCount' | 'intervalDays' | 'easeFactor' | 'difficulty'>,
    rating: FlashcardRating,
    currentDate: Date = new Date()
  ): SpacedRepetitionResult {
    const todayStr = formatDate(currentDate);
    let easeFactor = card.easeFactor || 2.5;
    let repetitionCount = card.repetitionCount || 0;
    let intervalDays = card.intervalDays || 0;
    let state: FlashcardState = 'due';

    const diffMultiplier = this.getDifficultyMultiplier(card.difficulty);

    switch (rating) {
      case 'again': {
        // Complete lapse: reset repetitions, review again today (0 days interval)
        repetitionCount = 0;
        intervalDays = 0;
        easeFactor = Math.max(this.minEaseFactor, easeFactor - 0.2);
        state = 'learning';
        break;
      }

      case 'hard': {
        // Struggled: advance repetition count slowly, slight interval increase
        repetitionCount += 1;
        intervalDays = Math.max(1, Math.round((intervalDays === 0 ? 1 : intervalDays * 1.2) * diffMultiplier));
        easeFactor = Math.max(this.minEaseFactor, easeFactor - 0.15);
        state = 'learning';
        break;
      }

      case 'good': {
        // Normal recall: standard SM-2 intervals
        repetitionCount += 1;
        if (repetitionCount === 1) {
          intervalDays = 1;
        } else if (repetitionCount === 2) {
          intervalDays = 3;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor * diffMultiplier);
        }
        state = repetitionCount >= 2 ? 'learned' : 'learning';
        break;
      }

      case 'easy': {
        // Mastered: leap ahead, increase ease factor
        repetitionCount += 2;
        if (repetitionCount <= 2) {
          intervalDays = 4;
        } else {
          intervalDays = Math.max(4, Math.round((intervalDays === 0 ? 4 : intervalDays * easeFactor * 1.3) * diffMultiplier));
        }
        easeFactor = Math.min(3.0, easeFactor + 0.15);
        state = 'learned';
        break;
      }
    }

    // Clamp maximum interval
    intervalDays = Math.min(this.maxIntervalDays, Math.max(0, intervalDays));

    const nextDate = addDays(currentDate, intervalDays);
    const nextReviewDate = formatDate(nextDate);

    return {
      state,
      repetitionCount,
      intervalDays,
      easeFactor: Math.round(easeFactor * 100) / 100,
      nextReviewDate,
      lastReviewedAt: todayStr,
    };
  }
}

/**
 * Singleton default strategy instance
 */
export const defaultSpacedRepetitionStrategy = new SM2SpacedRepetitionStrategy();

/**
 * Determine if a card is due for review on a given date (default today)
 */
export function isCardDue(card: Flashcard, referenceDate: Date = new Date()): boolean {
  if (card.state === 'learning') return true;
  const todayStr = formatDate(referenceDate);
  return !card.nextReviewDate || card.nextReviewDate <= todayStr;
}
