import { EvaluationResult, QuestionItem, QuestionType } from '../../types/question';

export interface QuestionValidatorResult {
  isValid: boolean;
  errors: string[];
}

export interface QuestionTypeEvaluator {
  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult;
  validate(question: Partial<QuestionItem>): QuestionValidatorResult;
}

/**
 * Single Choice Question Evaluator
 */
export class SingleChoiceEvaluator implements QuestionTypeEvaluator {
  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult {
    const selectedId = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    const isCorrect = Boolean(selectedId && selectedId === question.correctOptionId);

    return {
      isCorrect,
      scoreRatio: isCorrect ? 1.0 : 0.0,
      expectedAnswers: [question.correctOptionId],
      userAnswers: selectedId ? [selectedId] : [],
      feedback: isCorrect ? 'Chính xác!' : 'Đáp án chưa chính xác.',
    };
  }

  validate(question: Partial<QuestionItem>): QuestionValidatorResult {
    const errors: string[] = [];
    if (!question.content || question.content.trim().length === 0) {
      errors.push('Nội dung câu hỏi không được để trống.');
    }
    if (!question.options || question.options.length < 2) {
      errors.push('Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn.');
    } else {
      const hasEmptyOption = question.options.some(o => !o.text || o.text.trim().length === 0);
      if (hasEmptyOption) {
        errors.push('Tất cả các phương án lựa chọn phải có nội dung.');
      }
    }
    if (!question.correctOptionId) {
      errors.push('Phải chọn một đáp án đúng cho câu hỏi.');
    } else if (question.options && !question.options.some(o => o.id === question.correctOptionId)) {
      errors.push('Đáp án đúng phải nằm trong danh sách các phương án lựa chọn.');
    }
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Multiple Choice Question Evaluator
 */
export class MultipleChoiceEvaluator implements QuestionTypeEvaluator {
  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult {
    const selectedIds = Array.isArray(userAnswer) ? userAnswer : [userAnswer].filter(Boolean);
    const correctIds = question.correctOptionIds && question.correctOptionIds.length > 0
      ? question.correctOptionIds
      : [question.correctOptionId];

    const sortedSelected = [...selectedIds].sort();
    const sortedCorrect = [...correctIds].sort();

    const isCorrect =
      sortedSelected.length === sortedCorrect.length &&
      sortedSelected.every((val, idx) => val === sortedCorrect[idx]);

    // Partial credit calculation: correct selections minus wrong selections / total correct
    let matches = 0;
    for (const sel of selectedIds) {
      if (correctIds.includes(sel)) matches += 1;
      else matches = Math.max(0, matches - 0.5);
    }
    const scoreRatio = correctIds.length > 0 ? Math.max(0, Math.min(1, matches / correctIds.length)) : 0;

    return {
      isCorrect,
      scoreRatio,
      expectedAnswers: correctIds,
      userAnswers: selectedIds,
      feedback: isCorrect ? 'Chính xác toàn bộ các đáp án!' : 'Bạn chưa chọn đúng và đủ tất cả các đáp án.',
    };
  }

  validate(question: Partial<QuestionItem>): QuestionValidatorResult {
    const errors: string[] = [];
    if (!question.content || question.content.trim().length === 0) {
      errors.push('Nội dung câu hỏi không được để trống.');
    }
    if (!question.options || question.options.length < 2) {
      errors.push('Phải có ít nhất 2 phương án lựa chọn.');
    }
    const correctList = question.correctOptionIds || (question.correctOptionId ? [question.correctOptionId] : []);
    if (correctList.length === 0) {
      errors.push('Phải chọn ít nhất 1 đáp án đúng cho câu trắc nghiệm nhiều đáp án.');
    }
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * True / False Question Evaluator
 */
export class TrueFalseEvaluator implements QuestionTypeEvaluator {
  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult {
    const selectedId = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    const isCorrect = selectedId === question.correctOptionId;

    return {
      isCorrect,
      scoreRatio: isCorrect ? 1.0 : 0.0,
      expectedAnswers: [question.correctOptionId],
      userAnswers: selectedId ? [selectedId] : [],
      feedback: isCorrect ? 'Đúng!' : 'Sai rồi.',
    };
  }

  validate(question: Partial<QuestionItem>): QuestionValidatorResult {
    const errors: string[] = [];
    if (!question.content || question.content.trim().length === 0) {
      errors.push('Nội dung mệnh đề không được để trống.');
    }
    if (!question.correctOptionId) {
      errors.push('Phải xác định mệnh đề là Đúng (True) hay Sai (False).');
    }
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Short Answer Evaluator (extensible for future AI / regex / text match)
 */
export class ShortAnswerEvaluator implements QuestionTypeEvaluator {
  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult {
    const textInput = (Array.isArray(userAnswer) ? userAnswer[0] : userAnswer || '').trim().toLowerCase();
    const expected = (question.correctAnswerText || '').trim().toLowerCase();
    const isCorrect = textInput.length > 0 && textInput === expected;

    return {
      isCorrect,
      scoreRatio: isCorrect ? 1.0 : 0.0,
      expectedAnswers: [question.correctAnswerText || ''],
      userAnswers: [textInput],
      feedback: isCorrect ? 'Chính xác!' : `Đáp án đúng là: ${question.correctAnswerText}`,
    };
  }

  validate(question: Partial<QuestionItem>): QuestionValidatorResult {
    const errors: string[] = [];
    if (!question.content || question.content.trim().length === 0) {
      errors.push('Nội dung câu hỏi không được để trống.');
    }
    if (!question.correctAnswerText || question.correctAnswerText.trim().length === 0) {
      errors.push('Phải cung cấp đáp án mẫu hoặc từ khóa chuẩn cho câu hỏi ngắn.');
    }
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Question Evaluation Registry (Strategy Pattern)
 */
export class QuestionEvaluatorRegistry {
  private evaluators: Map<QuestionType, QuestionTypeEvaluator> = new Map();

  constructor() {
    const singleChoice = new SingleChoiceEvaluator();
    this.evaluators.set('single_choice', singleChoice);
    this.evaluators.set('multiple_choice', new MultipleChoiceEvaluator());
    this.evaluators.set('true_false', new TrueFalseEvaluator());
    this.evaluators.set('short_answer', new ShortAnswerEvaluator());
    // Extensible fallback
    this.evaluators.set('fill_in_the_blank', new ShortAnswerEvaluator());
    this.evaluators.set('matching', singleChoice);
  }

  registerEvaluator(type: QuestionType, evaluator: QuestionTypeEvaluator): void {
    this.evaluators.set(type, evaluator);
  }

  evaluate(question: QuestionItem, userAnswer: string | string[]): EvaluationResult {
    const evaluator = this.evaluators.get(question.type) || this.evaluators.get('single_choice')!;
    return evaluator.evaluate(question, userAnswer);
  }

  validate(question: Partial<QuestionItem>): QuestionValidatorResult {
    const type = question.type || 'single_choice';
    const evaluator = this.evaluators.get(type) || this.evaluators.get('single_choice')!;
    return evaluator.validate(question);
  }
}

export const questionEvaluator = new QuestionEvaluatorRegistry();
