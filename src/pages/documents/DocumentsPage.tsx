import React, { useEffect, useState } from 'react';
import {
  FileText,
  Folder,
  FolderPlus,
  Grid,
  Image as ImageIcon,
  LayoutList,
  MoreVertical,
  Move,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { documentService } from '../../services/documentService';
import { subjectService } from '../../services/subjectService';
import { DocumentFileType, DocumentItem } from '../../types/document';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Dropdown } from '../../components/common/Dropdown';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterBar } from '../../components/common/FilterBar';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { Table } from '../../components/common/Table';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentUploadModal } from './DocumentUploadModal';

export const DocumentsPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Thư mục gốc' }
  ]);

  // UI States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New Folder Modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename Modal
  const [itemToRename, setItemToRename] = useState<DocumentItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Move Modal
  const [itemToMove, setItemToMove] = useState<DocumentItem | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>('');

  // Delete Dialog
  const [itemToDelete, setItemToDelete] = useState<DocumentItem | null>(null);

  const loadData = async () => {
    const [allDocs, subList] = await Promise.all([
      documentService.getAllDocuments(),
      subjectService.getSubjects(),
    ]);
    setDocuments(allDocs);
    setSubjects(subList);

    // If navigated directly to a specific doc
    if (selectedTargetId) {
      const target = allDocs.find(d => d.id === selectedTargetId);
      if (target) {
        if (target.type === 'folder') {
          setCurrentFolderId(target.id);
        } else {
          setPreviewDoc(target);
          setIsPreviewOpen(true);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, selectedTargetId]);

  // Folder navigation
  const openFolder = (folder: DocumentItem) => {
    setCurrentFolderId(folder.id);
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToHistory = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory(prev => prev.slice(0, index + 1));
  };

  // Filter & Sort
  const currentFolderItems = documents.filter(d => {
    if (searchQuery.trim()) {
      return d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return d.parentFolderId === currentFolderId;
  });

  const filteredItems = currentFolderItems.filter(item => {
    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'folder') return item.type === 'folder';
    if (selectedTypeFilter === 'pdf') return item.type === 'pdf';
    if (selectedTypeFilter === 'doc') return ['docx', 'txt', 'md'].includes(item.type);
    if (selectedTypeFilter === 'slide') return item.type === 'pptx';
    if (selectedTypeFilter === 'image') return ['png', 'jpg'].includes(item.type);
    if (selectedTypeFilter === 'favorite') return item.isFavorite;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Luôn ưu tiên thư mục lên trên trong grid view
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;

    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'date') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
    return 0;
  });

  // Action Handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await documentService.createFolder(newFolderName.trim(), currentFolderId);
      toast.success('Đã tạo thư mục mới', newFolderName);
      setNewFolderName('');
      setIsNewFolderOpen(false);
      await loadData();
      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Không thể tạo thư mục: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !renameValue.trim()) return;
    try {
      await documentService.renameDocument(itemToRename.id, renameValue.trim());
      toast.success('Đã đổi tên thành công', renameValue);
      setItemToRename(null);
      await loadData();
      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Không thể đổi tên: ' + (err?.message || 'Lỗi'));
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToMove) return;
    try {
      const dest = targetMoveFolderId === 'root' ? null : targetMoveFolderId;
      await documentService.moveDocument(itemToMove.id, dest);
      toast.success('Đã di chuyển tệp thành công');
      setItemToMove(null);
      await loadData();
      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Không thể di chuyển: ' + (err?.message || 'Lỗi'));
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const res = await documentService.toggleFavorite(id);
    if (res) {
      toast.success(res.isFavorite ? 'Đã thêm vào mục yêu thích' : 'Đã bỏ khỏi mục yêu thích');
      await loadData();
      triggerDataRefresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await documentService.deleteDocument(itemToDelete.id);
      toast.success('Đã xóa thành công', itemToDelete.name);
      setItemToDelete(null);
      await loadData();
      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Không thể xóa: ' + (err?.message || 'Lỗi'));
    }
  };

  const getFileIcon = (type: DocumentFileType) => {
    switch (type) {
      case 'folder': return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
      case 'pdf': return <FileText className="w-5 h-5 text-rose-500" />;
      case 'docx': return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'pptx': return <FileText className="w-5 h-5 text-orange-500" />;
      case 'png':
      case 'jpg': return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm tệp hoặc thẻ tag..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewFolderOpen(true)}
            leftIcon={<FolderPlus className="w-4 h-4" />}
          >
            Tạo thư mục
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Tải lên tài liệu
          </Button>
        </div>
      </div>

      {/* Filter Bar and Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <FilterBar
          options={[
            { id: 'all', label: 'Tất cả' },
            { id: 'folder', label: 'Thư mục' },
            { id: 'pdf', label: 'PDF' },
            { id: 'doc', label: 'Văn bản (Word/MD)' },
            { id: 'slide', label: 'Slide (PPTX)' },
            { id: 'image', label: 'Hình ảnh' },
            { id: 'favorite', label: 'Đã gắn sao' },
          ]}
          activeId={selectedTypeFilter}
          onSelect={setSelectedTypeFilter}
        />

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
          <span>Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="name">Tên (A-Z)</option>
            <option value="date">Ngày cập nhật</option>
            <option value="size">Kích thước</option>
          </select>
        </div>
      </div>

      {/* Breadcrumb Folder Trail */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 py-1 overflow-x-auto no-scrollbar">
          {folderHistory.map((step, idx) => (
            <React.Fragment key={step.id || 'root'}>
              {idx > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              <button
                type="button"
                onClick={() => navigateToHistory(idx)}
                className={`hover:text-indigo-600 transition-colors truncate max-w-[150px] ${
                  idx === folderHistory.length - 1
                    ? 'font-bold text-slate-900 dark:text-slate-100'
                    : ''
                }`}
              >
                {step.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* File & Folder Grid / List */}
      {sortedItems.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Không tìm thấy tài liệu' : 'Thư mục này đang trống'}
          description={
            searchQuery
              ? 'Thử tìm kiếm với tên tệp hoặc thẻ tag khác.'
              : 'Tải lên tài liệu hoặc tạo thư mục mới để bắt đầu lưu trữ tài liệu môn học.'
          }
          action={
            <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
              Tải lên tài liệu ngay
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map(item => {
            const isFolder = item.type === 'folder';
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isFolder) openFolder(item);
                  else {
                    setPreviewDoc(item);
                    setIsPreviewOpen(true);
                  }
                }}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer transition-all duration-150 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                      {getFileIcon(item.type)}
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(item.id)}
                        className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>

                      <Dropdown
                        align="right"
                        trigger={
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        items={[
                          {
                            label: 'Xem trước',
                            onClick: () => {
                              setPreviewDoc(item);
                              setIsPreviewOpen(true);
                            },
                          },
                          {
                            label: 'Đổi tên',
                            onClick: () => {
                              setItemToRename(item);
                              setRenameValue(item.name);
                            },
                          },
                          {
                            label: 'Di chuyển',
                            icon: <Move className="w-3.5 h-3.5" />,
                            onClick: () => {
                              setItemToMove(item);
                              setTargetMoveFolderId('root');
                            },
                          },
                          { divider: true, label: '' },
                          {
                            label: 'Xóa tệp',
                            danger: true,
                            icon: <Trash2 className="w-3.5 h-3.5" />,
                            onClick: () => setItemToDelete(item),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isFolder ? 'Thư mục' : formatFileSize(item.size)}
                  </p>
                </div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {item.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 truncate max-w-[100px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <Table<DocumentItem>
          data={sortedItems}
          keyExtractor={d => d.id}
          onRowClick={d => {
            if (d.type === 'folder') openFolder(d);
            else {
              setPreviewDoc(d);
              setIsPreviewOpen(true);
            }
          }}
          columns={[
            {
              key: 'name',
              title: 'Tên tệp',
              render: (d) => (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{getFileIcon(d.type)}</div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                      {d.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {d.tags.map(t => (
                        <span key={t} className="text-[10px] text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              title: 'Loại',
              width: '100px',
              render: (d) => (
                <Badge variant="neutral" size="sm">
                  {d.type.toUpperCase()}
                </Badge>
              ),
            },
            {
              key: 'size',
              title: 'Kích thước',
              width: '120px',
              render: (d) => formatFileSize(d.size),
            },
            {
              key: 'updatedAt',
              title: 'Cập nhật',
              width: '140px',
              render: (d) => new Date(d.updatedAt).toLocaleDateString('vi-VN'),
            },
            {
              key: 'actions',
              title: '',
              align: 'right',
              width: '80px',
              render: (d) => (
                <div onClick={e => e.stopPropagation()} className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(d.id)}
                    className="p-1 text-slate-300 hover:text-amber-400"
                  >
                    <Star className={`w-4 h-4 ${d.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(d)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Modals */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewDoc(null);
          setSelectedTargetId(undefined);
        }}
        document={previewDoc}
        onToggleFavorite={handleToggleFavorite}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (file, subjectId, tags) => {
          await documentService.uploadFile(file, currentFolderId, subjectId, tags);
          toast.success('Đã tải lên tệp tin thành công', file.name);
          triggerDataRefresh();
        }}
        subjects={subjects}
        currentFolderId={currentFolderId}
      />

      {/* New Folder Modal */}
      <Modal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        title="Tạo thư mục mới"
        size="sm"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Tên thư mục"
            placeholder="Ví dụ: Đề thi thử, Bài giảng tuần 3..."
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewFolderOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Tạo thư mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!itemToRename}
        onClose={() => setItemToRename(null)}
        title="Đổi tên tài liệu"
        size="sm"
      >
        <form onSubmit={handleRename} className="space-y-4">
          <Input
            label="Tên mới"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setItemToRename(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu tên mới
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Modal */}
      <Modal
        isOpen={!!itemToMove}
        onClose={() => setItemToMove(null)}
        title="Di chuyển tài liệu"
        size="sm"
      >
        <form onSubmit={handleMove} className="space-y-4">
          <Select
            label="Chọn thư mục đích đến"
            value={targetMoveFolderId}
            onChange={e => setTargetMoveFolderId(e.target.value)}
            options={[
              { value: 'root', label: '📁 Thư mục gốc (Root)' },
              ...documents
                .filter(d => d.type === 'folder' && d.id !== itemToMove?.id)
                .map(f => ({ value: f.id, label: `📁 ${f.name}` }))
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setItemToMove(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Di chuyển
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title={itemToDelete?.type === 'folder' ? 'Xác nhận xóa thư mục' : 'Xác nhận xóa tài liệu'}
        message={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <strong className="text-slate-900 dark:text-slate-100">{itemToDelete?.name}</strong>?
            {itemToDelete?.type === 'folder' && ' Toàn bộ các tệp bên trong thư mục này cũng sẽ bị xóa.'}
          </>
        }
      />
    </div>
  );
};
