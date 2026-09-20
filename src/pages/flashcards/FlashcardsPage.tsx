import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Play,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { flashcardService } from '../../services/flashcardService';
import { importExportService } from '../../services/dataExchange/importExportService';
import { subjectService } from '../../services/subjectService';
import { Flashcard, FlashcardDeck, FlashcardRating } from '../../types/flashcard';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataImportModal } from '../../components/common/DataImportModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { FlashcardDeckModal } from './FlashcardDeckModal';
import { FlashcardStudyPlayer } from './FlashcardStudyPlayer';

export const FlashcardsPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [isStudying, setIsStudying] = useState(false);

  // Deck Modal states
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState<FlashcardDeck | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);

  // Card Modal states
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardHint, setCardHint] = useState('');
  const [cardDifficulty, setCardDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);

  // Card Move modal
  const [cardToMove, setCardToMove] = useState<Flashcard | null>(null);
  const [targetDeckId, setTargetDeckId] = useState<string>('');

  // Filters & Search
  const [cardSearch, setCardSearch] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState<'all' | 'due' | 'learning' | 'new' | 'learned'>('all');

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const loadData = async () => {
    const [allDecks, allCards, allSubs] = await Promise.all([
      flashcardService.getDecks(),
      flashcardService.getCards(),
      subjectService.getSubjects(),
    ]);
    setDecks(allDecks);
    setCards(allCards);
    setSubjects(allSubs);

    if (selectedTargetId) {
      const found = allDecks.find(d => d.id === selectedTargetId);
      if (found) setSelectedDeck(found);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, selectedTargetId]);

  const deckCards = selectedDeck ? cards.filter(c => c.deckId === selectedDeck.id) : [];

  // Filtered Cards
  const filteredCards = deckCards.filter(c => {
    if (cardStatusFilter !== 'all' && c.state !== cardStatusFilter) return false;
    if (cardSearch.trim().length > 0) {
      const q = cardSearch.toLowerCase();
      return (
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        (c.hint && c.hint.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Deck Handlers
  const handleSaveDeck = async (deckData: Omit<FlashcardDeck, 'id' | 'createdAt'> & { id?: string }) => {
    const saved = await flashcardService.saveDeck(deckData);
    toast.success('Đã lưu bộ thẻ thành công', saved.title);
    triggerDataRefresh();
  };

  const handleDeleteDeckConfirm = async () => {
    if (!deckToDelete) return;
    await flashcardService.deleteDeck(deckToDelete.id);
    toast.success('Đã xóa bộ thẻ');
    if (selectedDeck?.id === deckToDelete.id) setSelectedDeck(null);
    setDeckToDelete(null);
    triggerDataRefresh();
  };

  // Card Handlers
  const handleOpenCardModal = (card?: Flashcard) => {
    if (card) {
      setCardToEdit(card);
      setCardFront(card.front);
      setCardBack(card.back);
      setCardHint(card.hint || '');
      setCardDifficulty(card.difficulty || 'medium');
    } else {
      setCardToEdit(null);
      setCardFront('');
      setCardBack('');
      setCardHint('');
      setCardDifficulty('medium');
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeck) return;

    if (!cardFront.trim() || !cardBack.trim()) {
      toast.error('Vui lòng nhập cả mặt trước và mặt sau');
      return;
    }

    await flashcardService.saveCard({
      id: cardToEdit ? cardToEdit.id : undefined,
      deckId: selectedDeck.id,
      front: cardFront.trim(),
      back: cardBack.trim(),
      hint: cardHint.trim() || undefined,
      difficulty: cardDifficulty,
      state: cardToEdit ? cardToEdit.state : 'new',
      repetitionCount: cardToEdit ? cardToEdit.repetitionCount : 0,
      intervalDays: cardToEdit ? cardToEdit.intervalDays : 0,
      nextReviewDate: cardToEdit ? cardToEdit.nextReviewDate : new Date().toISOString().slice(0, 10),
    });

    toast.success(cardToEdit ? 'Đã cập nhật thẻ' : 'Đã thêm thẻ mới');
    setIsCardModalOpen(false);
    triggerDataRefresh();
  };

  const handleDeleteCardConfirm = async () => {
    if (!cardToDelete) return;
    await flashcardService.deleteCard(cardToDelete.id);
    toast.success('Đã xóa thẻ');
    setCardToDelete(null);
    triggerDataRefresh();
  };

  const handleMoveCardConfirm = async () => {
    if (!cardToMove || !targetDeckId) return;
    await flashcardService.moveCard(cardToMove.id, targetDeckId);
    toast.success('Đã chuyển thẻ sang bộ mới');
    setCardToMove(null);
    triggerDataRefresh();
  };

  // Spaced repetition review handler
  const handleReviewCard = async (cardId: string, rating: FlashcardRating) => {
    await flashcardService.reviewCard(cardId, rating);
    triggerDataRefresh();
  };

  // Export handlers
  const handleExportJSON = () => {
    if (!selectedDeck) return;
    const jsonStr = importExportService.exportFlashcardsJSON(deckCards);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards_${selectedDeck.title.replace(/\s+/g, '_')}.json`;
    a.click();
    toast.success('Đã xuất tệp JSON thành công');
  };

  const handleExportCSV = () => {
    if (!selectedDeck) return;
    const csvStr = importExportService.exportFlashcardsCSV(deckCards);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards_${selectedDeck.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    toast.success('Đã xuất tệp CSV thành công');
  };

  // STUDY MODE ACTIVE VIEW
  if (isStudying && selectedDeck) {
    return (
      <FlashcardStudyPlayer
        deck={selectedDeck}
        cards={deckCards}
        onReviewCard={handleReviewCard}
        onExit={() => setIsStudying(false)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedDeck && (
              <button
                type="button"
                onClick={() => setSelectedDeck(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Quay lại danh sách bộ thẻ"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              {selectedDeck ? selectedDeck.title : 'Thẻ Ghi Nhớ Flashcard'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedDeck
              ? selectedDeck.description || 'Ôn tập thuật toán ngắt quãng Spaced Repetition (SRS)'
              : 'Ghi nhớ công thức, từ vựng và định nghĩa trọng tâm với thuật toán lặp lại ngắt quãng'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedDeck ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
              >
                Xuất CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Nhập thẻ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenCardModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Thêm thẻ
              </Button>
              {deckCards.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsStudying(true)}
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                >
                  Bắt đầu học ({deckCards.length})
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDeckToEdit(null);
                setIsDeckModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Tạo bộ thẻ mới
            </Button>
          )}
        </div>
      </div>

      {/* VIEW: DECK DETAIL (CARDS INSIDE DECK) */}
      {selectedDeck ? (
        <div className="space-y-5">
          {/* Deck Status Bar & Filter Controls */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'due', 'learning', 'new', 'learned'] as const).map(status => {
                const isSelected = cardStatusFilter === status;
                const label =
                  status === 'all'
                    ? `Tất cả (${deckCards.length})`
                    : status === 'due'
                    ? `Cần ôn (${deckCards.filter(c => c.state === 'due').length})`
                    : status === 'learning'
                    ? `Đang học (${deckCards.filter(c => c.state === 'learning').length})`
                    : status === 'new'
                    ? `Mới (${deckCards.filter(c => c.state === 'new').length})`
                    : `Đã thuộc (${deckCards.filter(c => c.state === 'learned').length})`;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCardStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Tìm nội dung thẻ..."
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                className="text-xs"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <EmptyState
              title="Không tìm thấy thẻ nào"
              description="Thử thay đổi bộ lọc trạng thái hoặc thêm thẻ flashcard mới vào bộ này."
              action={
                <Button variant="primary" size="sm" onClick={() => handleOpenCardModal()}>
                  Thêm thẻ ngay
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map((card, idx) => (
                <div
                  key={card.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        Thẻ #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {card.difficulty && (
                          <Badge variant="neutral" size="sm">
                            {card.difficulty}
                          </Badge>
                        )}
                        <Badge
                          variant={card.state === 'learned' ? 'success' : card.state === 'due' ? 'warning' : 'primary'}
                          size="sm"
                        >
                          {card.state === 'learned' ? 'Đã thuộc' : card.state === 'due' ? 'Đến hạn' : card.state === 'learning' ? 'Đang học' : 'Mới'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Mặt trước
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-3">
                        {card.front.replace(/\$/g, '')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Mặt sau
                      </span>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 line-clamp-3 font-medium">
                        {card.back.replace(/\$/g, '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>
                      Chu kỳ: {card.intervalDays} ngày • Lặp: {card.repetitionCount}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCardToMove(card);
                          setTargetDeckId(decks.find(d => d.id !== selectedDeck.id)?.id || '');
                        }}
                        className="p-1 hover:text-indigo-600 transition-colors"
                        title="Chuyển sang bộ khác"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCardModal(card)}
                        className="p-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Sửa thẻ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardToDelete(card)}
                        className="p-1 hover:text-rose-600 transition-colors"
                        title="Xóa thẻ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: DECKS LIST */
        decks.length === 0 ? (
          <EmptyState
            title="Chưa có bộ thẻ Flashcard"
            description="Tạo bộ thẻ để ghi nhớ công thức toán học, từ vựng và khái niệm trọng tâm."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsDeckModalOpen(true)}>
                Tạo bộ thẻ đầu tiên
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {decks.map(deck => {
              const count = deck.totalCount ?? cards.filter(c => c.deckId === deck.id).length;
              const due = deck.dueCount ?? cards.filter(c => c.deckId === deck.id && c.state === 'due').length;

              return (
                <div
                  key={deck.id}
                  onClick={() => setSelectedDeck(deck)}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all duration-150 flex flex-col justify-between group active:scale-99"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                        style={{ backgroundColor: deck.color }}
                      >
                        <Layers className="w-5 h-5" />
                      </div>
                      <Badge variant="neutral" size="sm">
                        {count} thẻ
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {deck.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {deck.description || 'Chưa có mô tả.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {due > 0 ? `${due} thẻ cần ôn` : 'Đã ôn xong'}
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setDeckToEdit(deck);
                          setIsDeckModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Sửa bộ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeckToDelete(deck)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa bộ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Deck Modal */}
      <FlashcardDeckModal
        isOpen={isDeckModalOpen}
        onClose={() => {
          setIsDeckModalOpen(false);
          setDeckToEdit(null);
        }}
        onSave={handleSaveDeck}
        deckToEdit={deckToEdit}
        subjects={subjects}
      />

      {/* Card Create / Edit Modal */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={cardToEdit ? 'Chỉnh sửa thẻ' : 'Thêm thẻ flashcard mới'}
        size="md"
      >
        <form onSubmit={handleSaveCard} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mặt trước (Câu hỏi / Thuật ngữ / Đề bài)
            </label>
            <textarea
              rows={3}
              placeholder="Nhập câu hỏi... (Hỗ trợ viết công thức $$...$$)"
              value={cardFront}
              onChange={e => setCardFront(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mặt sau (Câu trả lời / Định nghĩa / Lời giải)
            </label>
            <textarea
              rows={3}
              placeholder="Nhập đáp án..."
              value={cardBack}
              onChange={e => setCardBack(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Gợi ý (tùy chọn)"
              placeholder="Gợi ý gợi nhớ ngắn..."
              value={cardHint}
              onChange={e => setCardHint(e.target.value)}
            />
            <Select
              label="Độ khó ban đầu"
              value={cardDifficulty}
              onChange={e => setCardDifficulty(e.target.value as any)}
              options={[
                { value: 'easy', label: 'Dễ (Easy)' },
                { value: 'medium', label: 'Vừa (Medium)' },
                { value: 'hard', label: 'Khó (Hard)' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCardModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {cardToEdit ? 'Lưu thẻ' : 'Thêm thẻ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Card Modal */}
      <Modal
        isOpen={!!cardToMove}
        onClose={() => setCardToMove(null)}
        title="Chuyển thẻ sang bộ khác"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chọn bộ thẻ bạn muốn di chuyển thẻ này sang:
          </p>
          <Select
            label="Bộ thẻ đích"
            value={targetDeckId}
            onChange={e => setTargetDeckId(e.target.value)}
            options={decks
              .filter(d => d.id !== selectedDeck?.id)
              .map(d => ({ value: d.id, label: d.title }))}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setCardToMove(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleMoveCardConfirm}
              disabled={!targetDeckId}
            >
              Chuyển thẻ
            </Button>
          </div>
        </div>
      </Modal>

      {/* Data Import Modal */}
      <DataImportModal<Flashcard>
        isOpen={isImportModalOpen}
        title="Nhập thẻ Flashcard từ tệp"
        acceptedFormats=".json, .csv"
        sampleDescription="Cột CSV: front, back, hint, difficulty"
        onValidateFile={(content, filename) => {
          if (filename.endsWith('.csv')) {
            return importExportService.validateFlashcardsCSV(content, deckCards);
          }
          return importExportService.validateFlashcardsJSON(content, deckCards);
        }}
        onConfirmImport={async validCards => {
          if (!selectedDeck) return;
          const count = await flashcardService.importCards(selectedDeck.id, validCards);
          toast.success(`Đã nạp thành công ${count} thẻ vào bộ "${selectedDeck.title}"`);
          triggerDataRefresh();
        }}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Delete Deck Confirm */}
      <ConfirmDialog
        isOpen={!!deckToDelete}
        onClose={() => setDeckToDelete(null)}
        onConfirm={handleDeleteDeckConfirm}
        isDestructive
        title="Xóa bộ thẻ Flashcard"
        message={`Bạn có chắc chắn muốn xóa bộ "${deckToDelete?.title}" và tất cả các thẻ bên trong?`}
      />

      {/* Delete Card Confirm */}
      <ConfirmDialog
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleDeleteCardConfirm}
        isDestructive
        title="Xóa thẻ Flashcard"
        message="Bạn có chắc chắn muốn xóa thẻ này không?"
      />
    </div>
  );
};
