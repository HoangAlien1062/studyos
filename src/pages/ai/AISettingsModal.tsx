import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Key, RefreshCw, Settings, ShieldAlert, Wifi, Database, Sliders, Zap } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { AIProvider, AISettingsState } from '../../types/ai';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { authService } from '../../services/authService';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

const GEMINI_MODEL_PRESETS = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Mới nhất 3.8 - Siêu tốc, Tối ưu hóa)' },
  { value: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro (Mới nhất 3.8 - Suy luận chuyên sâu)' },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (Gemini 3.7 - Tốc độ cao)' },
  { value: 'gemini-3.7-pro', label: 'Gemini 3.7 Pro (Gemini 3.7 - Xử lý phức tạp)' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { value: 'gemini-3.6-pro', label: 'Gemini 3.6 Pro' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'gemini-3.5-pro', label: 'Gemini 3.5 Pro' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Google Official 2.0)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'custom', label: '✏️ Tùy chỉnh (Nhập mã model bất kỳ...)' },
];

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const isAdmin = authService.getCurrentUser()?.role === 'admin' || authService.isAuthenticated();
  const [settings, setSettings] = useState<AISettingsState | null>(null);
  const [apiKeyText, setApiKeyText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('gemini-3.8-flash');
  const [customModel, setCustomModel] = useState('');
  const [isTestingKeys, setIsTestingKeys] = useState(false);
  const [keyPingResults, setKeyPingResults] = useState<Array<{ keyMask: string; latencyMs: number; status: 'ok' | 'error'; message?: string }>>([]);
  const [testResult, setTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'gemini' | 'generation' | 'rag'>('gemini');

  const loadSettings = async () => {
    const s = await aiService.getSettings();
    setSettings(s);
    const googleCfg = s.providers.google;
    const currentModel = googleCfg?.model || 'gemini-3.8-flash';
    setApiKeyText(googleCfg?.apiKey || '');

    const matchingPreset = GEMINI_MODEL_PRESETS.find(p => p.value === currentModel);
    if (matchingPreset && matchingPreset.value !== 'custom') {
      setSelectedPreset(matchingPreset.value);
      setCustomModel(matchingPreset.value);
    } else {
      setSelectedPreset('custom');
      setCustomModel(currentModel);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
      setKeyPingResults([]);
    }
  }, [isOpen]);

  if (!settings) return null;

  const parsedKeys = apiKeyText
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 5);

  const activeModel = selectedPreset === 'custom' ? (customModel.trim() || 'gemini-3.8-flash') : selectedPreset;

  const handleTestAllKeys = async () => {
    if (parsedKeys.length === 0) {
      setTestResult({ success: false, message: 'Vui lòng dán ít nhất 1 API Key Gemini vào khung bên dưới.' });
      return;
    }

    setIsTestingKeys(true);
    setTestResult(null);
    try {
      const { results, sortedKeys, fastestKey } = await aiService.testGeminiKeys(apiKeyText, activeModel);
      setKeyPingResults(results);

      const okCount = results.filter(r => r.status === 'ok').length;
      if (okCount > 0) {
        // Automatically sort keys in textarea by fastest ping
        setApiKeyText(sortedKeys);
        const fastestLatency = results.find(r => r.status === 'ok')?.latencyMs || 0;
        setTestResult({
          success: true,
          message: `Đo Ping thành công: ${okCount}/${results.length} Keys hoạt động tốt. Key nhanh nhất (${fastestKey}): ${fastestLatency}ms ⚡. Đã tự động sắp xếp key tối ưu!`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Tất cả ${results.length} Keys đều không thể kết nối tới Google Gemini (${activeModel}). Vui lòng kiểm tra lại API Key hoặc tên model.`,
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Lỗi khi đo ping API Keys' });
    } finally {
      setIsTestingKeys(false);
    }
  };

  const handleSaveAll = async () => {
    if (!settings) return;

    const updatedSettings: AISettingsState = {
      ...settings,
      primaryProvider: 'google',
      providers: {
        ...settings.providers,
        google: {
          ...settings.providers.google,
          isEnabled: true,
          apiKey: apiKeyText.trim(),
          model: activeModel,
          status: parsedKeys.length > 0 ? 'connected' : 'disconnected',
          isConfigured: parsedKeys.length > 0,
        },
      },
    };

    await aiService.saveSettings(updatedSettings);
    if (onSettingsSaved) onSettingsSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Cấu hình Trí tuệ AI Google Gemini Siêu Tốc</span>
        </div>
      }
      description="Hỗ trợ Gemini 3.5 - 3.8, kho API Key không giới hạn, cơ chế chọn Key nhanh nhất và Direct Streaming sub-second"
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveAll} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            Lưu cấu hình Gemini ({parsedKeys.length} Keys)
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'gemini'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Google Gemini & Kho API Key ({parsedKeys.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'generation'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tham số sinh (Temperature & Token)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'rag'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>RAG & Tìm kiếm Ngữ cảnh</span>
          </button>
        </div>

        {/* Speed Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-indigo-200 dark:border-indigo-900/50 flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Chế độ Direct Streaming Siêu Tốc (~200 - 400ms)</span>
              <Badge variant="success" size="sm">Đang kích hoạt</Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Hệ thống kết nối trực tiếp giữa trình duyệt và Google AI qua SSE stream, loại bỏ hoàn toàn độ trễ proxy trung gian Vercel (bỏ qua Cold Start 20s). Tự động luân chuyển giữa các key khi gặp giới hạn tốc độ 429.
            </p>
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            }`}
          >
            <Wifi className="w-4 h-4 flex-shrink-0" />
            <span>{testResult.message}</span>
          </div>
        )}

        {/* TAB 1: GEMINI CORE & KEY POOL */}
        {activeTab === 'gemini' && (
          <div className="space-y-4">
            {/* Model Selection */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Mô hình Google Gemini (Phiên bản)"
                  value={selectedPreset}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedPreset(val);
                    if (val !== 'custom') setCustomModel(val);
                  }}
                  options={GEMINI_MODEL_PRESETS}
                />
                <Input
                  label="Mã Model sử dụng (Chỉnh sửa tùy ý)"
                  placeholder="Ví dụ: gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash..."
                  value={customModel}
                  onChange={e => {
                    setCustomModel(e.target.value);
                    if (selectedPreset !== 'custom') setSelectedPreset('custom');
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Model đang chọn: <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{activeModel}</code>
              </p>
            </div>

            {/* Unlimited Key Pool Textarea */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Kho API Key Google Gemini (Không giới hạn số lượng)</span>
                </label>
                <Badge variant={parsedKeys.length > 0 ? 'success' : 'warning'} size="sm">
                  {parsedKeys.length} API Keys đã nạp
                </Badge>
              </div>

              <textarea
                rows={5}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder="Dán một hoặc nhiều API Key vào đây (Mỗi key trên một dòng, hoặc cách nhau bởi dấu phẩy, dấu chấm phẩy)&#10;Ví dụ:&#10;AIzaSyD_ExampleKey1...&#10;AIzaSyB_ExampleKey2...&#10;AIzaSyA_ExampleKey3..."
                value={apiKeyText}
                onChange={e => setApiKeyText(e.target.value)}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestAllKeys}
                  disabled={isTestingKeys || parsedKeys.length === 0}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isTestingKeys ? 'animate-spin' : ''}`} />}
                >
                  {isTestingKeys ? 'Đang đo ping song song...' : '⚡ Đo Ping & Sắp xếp Key nhanh nhất'}
                </Button>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Lấy API Key miễn phí tại Google AI Studio ↗
                </a>
              </div>

              {/* Ping Results Table / Cards */}
              {keyPingResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h6 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Kết quả đo Ping các Key (Đã tự động ưu tiên Key nhanh nhất):
                  </h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {keyPingResults.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                          r.status === 'ok'
                            ? idx === 0
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{r.keyMask}</span>
                        {r.status === 'ok' ? (
                          <span className="text-[11px]">
                            {r.latencyMs}ms {idx === 0 ? '⚡ Nhanh nhất' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400">Lỗi</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GENERATION PARAMETERS */}
        {activeTab === 'generation' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Nhiệt độ sinh (Temperature): {settings.temperature}
                </span>
                <span className="text-slate-400">
                  {settings.temperature <= 0.3
                    ? 'Chính xác / Logic cao'
                    : settings.temperature <= 0.7
                    ? 'Cân bằng sư phạm (Mặc định)'
                    : 'Sáng tạo cao'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Giới hạn Tokens tối đa (Max Output Tokens): {settings.maxTokens}
                </span>
                <span className="text-slate-400">Độ dài câu trả lời</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={settings.maxTokens}
                onChange={e => setSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        )}

        {/* TAB 3: RAG CONFIG */}
        {activeTab === 'rag' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Bật truy xuất tài liệu (RAG Ingestion)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tự động trích dẫn nội dung từ tài liệu bạn đính kèm khi hỏi đáp
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.ragEnabled ?? true}
                onChange={e => setSettings({ ...settings, ragEnabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Ngưỡng tương đồng Cosine: {settings.ragSimilarityThreshold ?? 0.65}
                </span>
                <span className="text-slate-400">Độ chính xác khớp đoạn văn</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={settings.ragSimilarityThreshold ?? 0.65}
                onChange={e => setSettings({ ...settings, ragSimilarityThreshold: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
