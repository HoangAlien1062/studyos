import { INITIAL_DECKS, INITIAL_FLASHCARDS } from '../data/initialFlashcards';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Flashcard, FlashcardDeck, FlashcardRating } from '../types/flashcard';
import { defaultSpacedRepetitionStrategy, isCardDue } from './algorithms/spacedRepetition';
import { authService } from './authService';
import { storage } from './storage';

const DECKS_KEY = 'flashcard_decks';
const CARDS_KEY = 'flashcard_cards';

export const flashcardService = {
  // === DECKS ===
  async getDecks(): Promise<FlashcardDeck[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }
    const allCards = await this.getCards();

    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('flashcard_decks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: FlashcardDeck[] = data.map(d => {
            const deckCards = allCards.filter(c => c.deckId === d.id);
            return {
              id: d.id,
              title: d.title,
              description: d.description || '',
              color: d.color,
              subjectId: d.subject_id || undefined,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
              totalCount: deckCards.length,
              newCount: deckCards.filter(c => c.state === 'new').length,
              learningCount: deckCards.filter(c => c.state === 'learning').length,
              dueCount: deckCards.filter(c => isCardDue(c)).length,
              learnedCount: deckCards.filter(c => c.state === 'learned').length,
            };
          });
          storage.set(DECKS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading decks:', err);
      }
    }

    const cachedDecks = storage.get<FlashcardDeck[]>(DECKS_KEY, []);
    return cachedDecks.map(d => {
      const deckCards = allCards.filter(c => c.deckId === d.id);
      return {
        ...d,
        totalCount: deckCards.length,
        newCount: deckCards.filter(c => c.state === 'new').length,
        learningCount: deckCards.filter(c => c.state === 'learning').length,
        dueCount: deckCards.filter(c => isCardDue(c)).length,
        learnedCount: deckCards.filter(c => c.state === 'learned').length,
      };
    });
  },

  async getDeckById(id: string): Promise<FlashcardDeck | undefined> {
    const list = await this.getDecks();
    return list.find(d => d.id === id);
  },

  async saveDeck(deck: Omit<FlashcardDeck, 'id' | 'createdAt'> & { id?: string }): Promise<FlashcardDeck> {
    const list = await this.getDecks();
    let saved: FlashcardDeck;
    const now = new Date().toISOString();

    if (deck.id) {
      const idx = list.findIndex(d => d.id === deck.id);
      if (idx !== -1) {
        saved = { ...list[idx], ...deck, updatedAt: now };
        list[idx] = saved;
      } else {
        saved = { ...deck, id: `deck-${Date.now()}`, createdAt: now, updatedAt: now };
        list.push(saved);
      }
    } else {
      saved = { ...deck, id: `deck-${Date.now()}`, createdAt: now, updatedAt: now };
      list.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const user = await authService.getProfile();
        await supabase.from('flashcard_decks').upsert({
          id: saved.id,
          user_id: user.id,
          title: saved.title,
          description: saved.description,
          color: saved.color,
          subject_id: saved.subjectId || null,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving deck:', err);
      }
    }

    storage.set(DECKS_KEY, list);
    return saved;
  },

  async renameDeck(id: string, newTitle: string): Promise<FlashcardDeck | undefined> {
    const list = await this.getDecks();
    const deck = list.find(d => d.id === id);
    if (!deck) return undefined;

    deck.title = newTitle;
    deck.updatedAt = new Date().toISOString();
    storage.set(DECKS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('flashcard_decks').update({ title: newTitle }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error renaming deck:', err);
      }
    }

    return deck;
  },

  async deleteDeck(id: string): Promise<boolean> {
    const list = await this.getDecks();
    storage.set(DECKS_KEY, list.filter(d => d.id !== id));

    const cards = await this.getCards();
    storage.set(CARDS_KEY, cards.filter(c => c.deckId !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('flashcards').delete().eq('deck_id', id);
        await supabase.from('flashcard_decks').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting deck:', err);
      }
    }

    return true;
  },

  // === CARDS ===
  async getCards(deckId?: string): Promise<Flashcard[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('flashcards').select('*').order('created_at', { ascending: true });
        if (deckId) query = query.eq('deck_id', deckId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped: Flashcard[] = data.map(c => ({
            id: c.id,
            deckId: c.deck_id,
            front: c.front_content,
            back: c.back_content,
            hint: c.notes || undefined,
            state: c.state || 'new',
            repetitionCount: c.repetition_count || 0,
            intervalDays: c.interval_days || 0,
            nextReviewDate: c.next_review_date,
            lastReviewedAt: c.last_reviewed_at || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading cards:', err);
      }
    }

    const all = storage.get<Flashcard[]>(CARDS_KEY, []);
    if (!deckId) return all;
    return all.filter(c => c.deckId === deckId);
  },

  async saveCard(card: Omit<Flashcard, 'id'> & { id?: string }): Promise<Flashcard> {
    const all = await this.getCards();
    let saved: Flashcard;
    const now = new Date().toISOString();

    if (card.id) {
      const idx = all.findIndex(c => c.id === card.id);
      if (idx !== -1) {
        saved = { ...all[idx], ...card, updatedAt: now };
        all[idx] = saved;
      } else {
        saved = { ...card, id: `card-${Date.now()}`, createdAt: now, updatedAt: now };
        all.push(saved);
      }
    } else {
      saved = {
        ...card,
        id: `card-${Date.now()}`,
        state: card.state || 'new',
        difficulty: card.difficulty || 'medium',
        repetitionCount: card.repetitionCount || 0,
        intervalDays: card.intervalDays || 0,
        nextReviewDate: card.nextReviewDate || new Date().toISOString().slice(0, 10),
        createdAt: now,
        updatedAt: now,
      };
      all.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const user = await authService.getProfile();
        await supabase.from('flashcards').upsert({
          id: saved.id,
          user_id: user.id,
          deck_id: saved.deckId,
          front_content: saved.front,
          back_content: saved.back,
          notes: saved.hint || '',
          state: saved.state,
          repetition_count: saved.repetitionCount,
          interval_days: saved.intervalDays,
          next_review_date: saved.nextReviewDate,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving card:', err);
      }
    }

    storage.set(CARDS_KEY, all);
    return saved;
  },

  async moveCard(cardId: string, targetDeckId: string): Promise<boolean> {
    const all = await this.getCards();
    const card = all.find(c => c.id === cardId);
    if (!card) return false;

    card.deckId = targetDeckId;
    card.updatedAt = new Date().toISOString();
    storage.set(CARDS_KEY, all);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('flashcards').update({ deck_id: targetDeckId }).eq('id', cardId);
      } catch (err) {
        console.warn('[Supabase Online] Error moving card:', err);
      }
    }

    return true;
  },

  async deleteCard(id: string): Promise<boolean> {
    const all = await this.getCards();
    storage.set(CARDS_KEY, all.filter(c => c.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('flashcards').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting card:', err);
      }
    }

    return true;
  },

  /**
   * Spaced Repetition (SRS) Review using modular strategy
   */
  async reviewCard(cardId: string, rating: FlashcardRating): Promise<Flashcard | undefined> {
    const all = await this.getCards();
    const card = all.find(c => c.id === cardId);
    if (!card) return undefined;

    // Call modular SRS Strategy
    const srsResult = defaultSpacedRepetitionStrategy.calculateNextReview(
      card,
      rating,
      new Date()
    );

    card.state = srsResult.state;
    card.repetitionCount = srsResult.repetitionCount;
    card.intervalDays = srsResult.intervalDays;
    card.easeFactor = srsResult.easeFactor;
    card.nextReviewDate = srsResult.nextReviewDate;
    card.lastReviewedAt = srsResult.lastReviewedAt;
    card.updatedAt = new Date().toISOString();

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('flashcards').update({
          state: card.state,
          repetition_count: card.repetitionCount,
          interval_days: card.intervalDays,
          next_review_date: card.nextReviewDate,
          last_reviewed_at: card.lastReviewedAt,
        }).eq('id', cardId);
      } catch (err) {
        console.warn('[Supabase Online] Error updating card review:', err);
      }
    }

    storage.set(CARDS_KEY, all);
    return card;
  },

  /**
   * Import multiple cards into a deck
   */
  async importCards(deckId: string, cards: Flashcard[]): Promise<number> {
    let count = 0;
    for (const c of cards) {
      await this.saveCard({
        ...c,
        deckId,
      });
      count++;
    }
    return count;
  },
};
