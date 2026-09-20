import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Key, RefreshCw, Settings, ShieldAlert, Wifi, Database, Sliders } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { AIProvider, AISettingsState } from '../../types/ai';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { Switch } from '../../components/common/Switch';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

const MODEL_PRESETS: Record<string, string[]> = {
  google: ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'],
  anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  openrouter: ['deepseek/deepseek-r1', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct', 'qwen/qwen-2.5-72b-instruct'],
  custom: ['qwen2.5-coder', 'deepseek-coder', 'llama3.3', 'mistral'],
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AISettingsState | null>(null);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);
  const [testResult, setTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'providers' | 'generation' | 'rag'>('providers');

  const loadSettings = async () => {
    const s = await aiService.getSettings();
    setSettings(s);
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!settings) return null;

  const handleProviderToggle = (providerId: AIProvider, isEnabled: boolean) => {
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...prev.providers[providerId],
            isEnabled,
          },
        },
      };
    });
  };

  const handleApiKeyChange = (providerId: AIProvider, apiKey: string) => {
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...prev.providers[providerId],
            apiKey,
          },
        },
      };
    });
  };

  const handleModelChange = (providerId: AIProvider, model: string) => {
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...prev.providers[providerId],
            model,
          },
        },
      };
    });
  };

  const handleBaseUrlChange = (providerId: AIProvider, baseUrl: string) => {
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...prev.providers[providerId],
            baseUrl,
          },
        },
      };
    });
  };

  const handleTestPing = async (providerId: AIProvider) => {
    setTestingProvider(providerId);
    setTestResult(null);
    try {
      const res = await aiService.testConnection(providerId);
      setTestResult({ message: res.message, success: res.success });
      await loadSettings();
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveAll = async () => {
    if (!settings) return;
    await aiService.saveSettings(settings);
    if (onSettingsSaved) onSettingsSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Cấu hình Trí tuệ AI Đa Nhà Cung Cấp & RAG</span>
        </div>
      }
      description="Quản lý 5 nhà cung cấp LLM, cơ chế Auto Routing & Fallback, tham số sinh và bộ trích xuất RAG"
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveAll}>
            Lưu tất cả cấu hình
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'providers'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Nhà cung cấp & Định tuyến ({Object.values(settings.providers).filter(p => p.isEnabled).length})</span>
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
            <span>Tham số sinh (LLM Parameters)</span>
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
            <span>RAG & Vector Search</span>
          </button>
        </div>

        {/* Test Result Toast Banner */}
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

        {/* TAB 1: PROVIDERS & ROUTING */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            {/* Routing Preferences Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Định tuyến chính (Primary Provider)"
                value={settings.primaryProvider}
                onChange={e => setSettings({ ...settings, primaryProvider: e.target.value as AIProvider })}
                options={[
                  { value: 'auto', label: 'Tự động chọn (Auto Routing thông minh)' },
                  { value: 'google', label: 'Google Gemini' },
                  { value: 'openai', label: 'OpenAI (GPT-4o)' },
                  { value: 'anthropic', label: 'Anthropic Claude' },
                  { value: 'openrouter', label: 'OpenRouter' },
                  { value: 'custom', label: 'Custom Endpoint' },
                ]}
              />

              <Select
                label="Chuyển đổi dự phòng (Fallback Provider)"
                value={settings.fallbackProvider}
                onChange={e => setSettings({ ...settings, fallbackProvider: e.target.value as AIProvider })}
                options={[
                  { value: 'openai', label: 'OpenAI (GPT-4o)' },
                  { value: 'google', label: 'Google Gemini' },
                  { value: 'anthropic', label: 'Anthropic Claude' },
                  { value: 'openrouter', label: 'OpenRouter' },
                  { value: 'custom', label: 'Custom Endpoint' },
                ]}
              />
            </div>

            {/* Provider List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {Object.values(settings.providers).map(provider => {
                if (provider.id === 'auto') return null;
                const presets = MODEL_PRESETS[provider.id] || [];

                return (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-xl border transition-all ${
                      provider.isEnabled
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {provider.name}
                            </h5>
                            {provider.isConfigured && (
                              <Badge variant="success" size="sm">
                                Đã lưu Key
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              Mô hình: {provider.model}
                            </span>
                            {provider.lastPingMs && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                • {provider.lastPingMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={provider.isEnabled}
                          onChange={val => handleProviderToggle(provider.id, val)}
                        />
                      </div>
                    </div>

                    {provider.isEnabled && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Input
                              type="password"
                              label="API Key (Mã hóa an toàn tại server)"
                              placeholder={provider.maskedApiKey || 'Nhập API Key...'}
                              value={provider.apiKey}
                              onChange={e => handleApiKeyChange(provider.id, e.target.value)}
                            />
                            {provider.maskedApiKey && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Khóa hiện tại: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{provider.maskedApiKey}</code>
                              </p>
                            )}
                          </div>

                          <div>
                            <Input
                              label="Tên mô hình (Model ID)"
                              value={provider.model}
                              onChange={e => handleModelChange(provider.id, e.target.value)}
                            />
                            {presets.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {presets.map(pm => (
                                  <button
                                    key={pm}
                                    type="button"
                                    onClick={() => handleModelChange(provider.id, pm)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                                      provider.model === pm
                                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {pm}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {provider.id === 'custom' && (
                          <Input
                            label="Base URL (Bảo vệ chống tấn công SSRF)"
                            placeholder="http://localhost:11434/v1"
                            value={provider.baseUrl || ''}
                            onChange={e => handleBaseUrlChange(provider.id, e.target.value)}
                          />
                        )}

                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestPing(provider.id)}
                            isLoading={testingProvider === provider.id}
                            leftIcon={<Wifi className="w-3.5 h-3.5" />}
                          >
                            Kiểm tra kết nối (Test Ping)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: GENERATION PARAMETERS */}
        {activeTab === 'generation' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Độ sáng tạo (Temperature): {settings.temperature}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {settings.temperature < 0.3 ? 'Chính xác & Khách quan' : settings.temperature > 0.7 ? 'Sáng tạo & Đa dạng' : 'Cân bằng'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Giới hạn Token (Max Tokens): {settings.maxTokens}
                </span>
                <span className="text-slate-400 text-[11px]">Độ dài phản hồi tối đa</span>
              </div>
              <input
                type="range"
                min="1024"
                max="8192"
                step="512"
                value={settings.maxTokens}
                onChange={e => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <Switch
                label="Phản hồi thời gian thực (Streaming SSE)"
                description="Hiển thị từng từ khi mô hình AI đang sinh thay vì chờ toàn bộ phản hồi."
                checked={settings.streamingEnabled ?? true}
                onChange={val => setSettings({ ...settings, streamingEnabled: val })}
              />
            </div>
          </div>
        )}

        {/* TAB 3: RAG & VECTOR SEARCH */}
        {activeTab === 'rag' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <Switch
              label="Kích hoạt RAG trên tài liệu học tập"
              description="Tự động trích xuất và tìm kiếm đoạn văn liên quan trong thư viện tài liệu của bạn khi đặt câu hỏi."
              checked={settings.ragEnabled ?? true}
              onChange={val => setSettings({ ...settings, ragEnabled: val })}
            />

            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Ngưỡng tương đồng tối thiểu (Cosine Threshold): {settings.ragSimilarityThreshold ?? 0.45}
                </span>
                <span className="text-slate-400 text-[11px]">Chỉ lấy đoạn trích có độ khớp $\ge$ ngưỡng này</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.8"
                step="0.05"
                value={settings.ragSimilarityThreshold ?? 0.45}
                onChange={e => setSettings({ ...settings, ragSimilarityThreshold: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Số đoạn trích đối chiếu tối đa ($K$ chunks): {settings.ragTopK ?? 4}
                </span>
                <span className="text-slate-400 text-[11px]">Số đoạn đưa vào ngữ cảnh AI</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={settings.ragTopK ?? 4}
                onChange={e => setSettings({ ...settings, ragTopK: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
