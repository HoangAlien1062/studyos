/**
 * Interactive Source Citation Badge & Modal for StudyOS RAG
 */

import React, { useState } from 'react';
import { BookOpen, ExternalLink, FileText, X } from 'lucide-react';
import { SourceCitation } from '../../types/ai';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export interface SourceCitationCardProps {
  citations: SourceCitation[];
}

export const SourceCitationCard: React.FC<SourceCitationCardProps> = ({ citations }) => {
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
        <span>Nguồn trích dẫn từ tài liệu học tập của bạn:</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {citations.map((cite, idx) => {
          const locStr = [
            cite.page !== undefined ? `Trang ${cite.page}` : '',
            cite.section ? `Mục: ${cite.section}` : '',
          ].filter(Boolean).join(' • ');

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveCitation(cite)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 text-[11px] text-indigo-700 dark:text-indigo-300 transition-colors group cursor-pointer"
            >
              <FileText className="w-3 h-3 text-indigo-500" />
              <span className="font-semibold truncate max-w-[150px]">{cite.documentName}</span>
              {locStr && <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80">({locStr})</span>}
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>

      {/* Citation Detail Modal */}
      {activeCitation && (
        <Modal
          isOpen={!!activeCitation}
          onClose={() => setActiveCitation(null)}
          title={
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Đoạn trích gốc: {activeCitation.documentName}</span>
            </div>
          }
          description={`Trích đoạn liên quan được đối chiếu với độ tương đồng ngữ nghĩa: ${Math.round(activeCitation.similarity * 100)}%`}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              {activeCitation.page !== undefined && (
                <Badge variant="primary" size="sm">
                  Trang {activeCitation.page}
                </Badge>
              )}
              {activeCitation.section && (
                <Badge variant="neutral" size="sm">
                  {activeCitation.section}
                </Badge>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {activeCitation.snippet}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
