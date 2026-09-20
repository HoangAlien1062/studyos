import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Database,
  Download,
  Key,
  Laptop,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { authService, StoredAccount, UserAccount } from '../../services/authService';
import { settingsService } from '../../services/settingsService';
import {
  clearCustomSupabaseConfig,
  getEffectiveSupabaseConfig,
  isSupabaseConfigured,
  saveCustomSupabaseConfig,
} from '../../lib/supabase';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { UserAvatar } from '../common/UserAvatar';

export interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const { currentUser, isAuthenticated, triggerDataRefresh, setIsAuthModalOpen, navigateTo } = useStudy();

  const [activeTab, setActiveTab] = useState<'profile' | 'accounts' | 'sync' | 'cloud'>('profile');

  // Accounts list
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sync Code
  const [generatedSyncCode, setGeneratedSyncCode] = useState('');
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Supabase Custom Config
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(isSupabaseConfigured);

  const reloadData = () => {
    setAccounts(authService.getRegisteredAccounts());
    const cfg = getEffectiveSupabaseConfig();
    setSupabaseUrl(cfg.url);
    setSupabaseAnonKey(cfg.anonKey);
    setIsCloudConnected(isSupabaseConfigured);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setGeneratedSyncCode('');
      setInputSyncCode('');
      setIsCopied(false);
    }
  }, [isOpen]);

  // Handle Switch Account
  const handleSwitchAccount = async (targetId: string) => {
    try {
      const switched = await authService.switchAccount(targetId);
      toast.success(`Đã chuyển sang tài khoản: ${switched.name}`);
      triggerDataRefresh();
      reloadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể chuyển tài khoản');
    }
  };

  // Handle Remove Account from device
  const handleRemoveAccount = async (targetId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name}" khỏi thiết bị này?`)) {
      return;
    }
    try {
      await authService.removeAccount(targetId);
      toast.success(`Đã xóa tài khoản "${name}" khỏi máy`);
      triggerDataRefresh();
      reloadData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa tài khoản');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(newPassword);
      toast.success('Đã đổi mật khẩu thành công!');
      setNewPassword('');
      setConfirmPassword('');
      reloadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể đổi mật khẩu');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Generate Sync Code
  const handleGenerateSyncCode = () => {
    try {
      const code = settingsService.createSyncCode();
      setGeneratedSyncCode(code);
      toast.success('Đã tạo mã đồng bộ không gian học tập!');
    } catch (err) {
      toast.error('Không thể tạo mã đồng bộ');
    }
  };

  // Handle Copy Sync Code
  const handleCopySyncCode = () => {
    if (!generatedSyncCode) return;
    navigator.clipboard.writeText(generatedSyncCode);
    setIsCopied(true);
    toast.success('Đã sao chép mã đồng bộ vào bộ nhớ tạm!');
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Handle Apply Sync Code (e.g. on Phone)
  const handleApplySyncCode = () => {
    if (!inputSyncCode.trim()) {
      toast.error('Vui lòng dán mã đồng bộ vào ô bên dưới.');
      return;
    }
    setSyncLoading(true);
    try {
      const ok = settingsService.applySyncCode(inputSyncCode.trim());
      if (ok) {
        toast.success('Đồng bộ thành công!', 'Toàn bộ tài khoản, môn học, bài tập đã được tải vào thiết bị này.');
        triggerDataRefresh();
        reloadData();
        setInputSyncCode('');
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        toast.error('Mã đồng bộ không hợp lệ hoặc dữ liệu bị lỗi.');
      }
    } catch (err) {
      toast.error('Lỗi khi áp dụng mã đồng bộ.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle Save Supabase Custom Config
  const handleSaveCloudConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast.error('Vui lòng điền đủ Supabase Project URL và Anon Key.');
      return;
    }

    const ok = saveCustomSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
    if (ok) {
      setIsCloudConnected(true);
      toast.success('Đã kết nối Supabase Cloud thành công!', 'Dữ liệu sẽ tự động đồng bộ thời gian thực giữa mọi thiết bị.');
      triggerDataRefresh();
    } else {
      toast.error('Kết nối Supabase thất bại. Vui lòng kiểm tra lại URL và Key.');
    }
  };

  // Handle Disconnect Supabase
  const handleClearCloudConfig = () => {
    clearCustomSupabaseConfig();
    setIsCloudConnected(isSupabaseConfigured);
    toast.info('Đã ngắt kết nối cấu hình Supabase tùy chỉnh.');
    triggerDataRefresh();
    reloadData();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className="pt-1 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Quản lý tài khoản & Đồng bộ thiết bị
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chuyển đổi tài khoản, bảo mật và đồng bộ không gian học giữa Máy tính & Điện thoại
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Tài khoản hiện tại</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'accounts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Danh sách tài khoản ({accounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'sync'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Đồng bộ PC $\leftrightarrow$ Điện thoại</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'cloud'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cơ sở dữ liệu Đám mây</span>
          </button>
        </div>

        {/* TAB 1: PROFILE & ACTIVE ACCOUNT */}
        {activeTab === 'profile' && (
          <div className="space-y-4 pt-1">
            {isAuthenticated && currentUser ? (
              <>
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <UserAvatar
                    avatarUrl={currentUser.avatarUrl}
                    name={currentUser.name}
                    size="xl"
                    className="ring-2 ring-indigo-200 dark:ring-indigo-800"
                  />
                  <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {currentUser.name}
                      </h4>
                      <Badge variant="success" size="sm">
                        Đang hoạt động
                      </Badge>
                      <Badge variant={currentUser.educationLevel === 'high_school' ? 'warning' : 'primary'} size="sm">
                        {currentUser.educationLevel === 'high_school' ? 'Cấp 3' : 'Đại học'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {currentUser.email}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      {currentUser.school || 'Trường học'} • {currentUser.gradeOrYear || 'Khối lớp / Niên khóa'}
                    </p>

                    <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          navigateTo('profile');
                        }}
                      >
                        Chỉnh sửa hồ sơ cá nhân
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => {
                          authService.logout();
                          triggerDataRefresh();
                          toast.info('Đã đăng xuất tài khoản.');
                          onClose();
                        }}
                        leftIcon={<LogOut className="w-3.5 h-3.5" />}
                      >
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Storage Status Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {isCloudConnected ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Cloud className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Laptop className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {isCloudConnected ? 'Đang lưu trữ trên Supabase Cloud' : 'Đang lưu trữ trên Bộ nhớ Cục bộ (Trình duyệt)'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isCloudConnected
                          ? 'Dữ liệu tự động đồng bộ thời gian thực giữa máy tính & điện thoại.'
                          : 'Dữ liệu chỉ nằm trên máy này. Hãy dùng tab "Đồng bộ PC <-> Điện thoại" để chuyển sang máy khác.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setActiveTab(isCloudConnected ? 'cloud' : 'sync')}
                  >
                    {isCloudConnected ? 'Xem cấu hình Cloud' : 'Xem cách đồng bộ'}
                  </Button>
                </div>

                {/* Change Password Form */}
                <Card title="Đổi mật khẩu tài khoản" className="p-4">
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        type="password"
                        label="Mật khẩu mới (Tối thiểu 6 ký tự)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-3.5 h-3.5" />}
                        required
                      />
                      <Input
                        type="password"
                        label="Xác nhận mật khẩu mới"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        leftIcon={<Key className="w-3.5 h-3.5" />}
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="xs"
                        variant="primary"
                        disabled={passwordLoading || !newPassword}
                      >
                        {passwordLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </>
            ) : (
              <div className="p-8 text-center space-y-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Bạn chưa đăng nhập tài khoản nào
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hãy đăng nhập hoặc tạo tài khoản để hệ thống lưu giữ tiến độ học tập và các môn học của bạn.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    setIsAuthModalOpen(true);
                  }}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Đăng nhập / Đăng ký ngay
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACCOUNTS LIST ON THIS DEVICE */}
        {activeTab === 'accounts' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Các tài khoản đã được lưu trên thiết bị này:
              </span>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                onClick={() => {
                  onClose();
                  setIsAuthModalOpen(true);
                }}
              >
                + Thêm tài khoản khác
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Chưa có tài khoản nào được lưu trên máy này.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {accounts.map(acc => {
                  const isActive = currentUser?.id === acc.id || currentUser?.email === acc.email;
                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          avatarUrl={acc.avatarUrl}
                          name={acc.name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {acc.name}
                            </p>
                            {isActive && (
                              <Badge variant="success" size="xs">
                                Đang dùng
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {acc.email}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {acc.school || 'Chưa đặt trường'} • {acc.educationLevel === 'high_school' ? 'Cấp 3' : 'Đại học'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isActive ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleSwitchAccount(acc.id)}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          >
                            Chuyển sang
                          </Button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(acc.id, acc.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Xóa tài khoản khỏi thiết bị này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MULTI-DEVICE SYNC HUB */}
        {activeTab === 'sync' && (
          <div className="space-y-4 pt-1">
            {/* Explanatory Banner */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
              <span className="font-bold block mb-1">
                💡 Tại sao đăng nhập trên điện thoại lại thấy trang trắng?
              </span>
              StudyOS hoạt động với cơ chế bảo vệ quyền riêng tư cá nhân: mặc định dữ liệu được lưu trên trình duyệt của máy bạn (Offline Storage). Để chuyển toàn bộ tài khoản, môn học và bài tập từ máy tính sang điện thoại, bạn dùng mã đồng bộ dưới đây trong 5 giây!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Export from PC */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Từ Máy tính: Tạo mã đồng bộ
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Gói toàn bộ tài khoản, môn học và file thành 1 mã duy nhất
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  className="w-full justify-center text-xs"
                  onClick={handleGenerateSyncCode}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Tạo mã đồng bộ ngay
                </Button>

                {generatedSyncCode && (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <textarea
                        readOnly
                        value={generatedSyncCode}
                        rows={3}
                        className="w-full p-2.5 text-[10px] font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none select-all"
                      />
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      className="w-full justify-center text-xs"
                      onClick={handleCopySyncCode}
                      leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {isCopied ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép mã đồng bộ'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Box 2: Import on Phone */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Trên Điện thoại: Nhập mã đồng bộ
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Dán mã vừa tạo trên máy tính vào đây
                    </p>
                  </div>
                </div>

                <textarea
                  value={inputSyncCode}
                  onChange={e => setInputSyncCode(e.target.value)}
                  placeholder="Dán mã đồng bộ nhận từ máy tính vào đây..."
                  rows={generatedSyncCode ? 5 : 3}
                  className="w-full p-2.5 text-[10px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                <Button
                  size="sm"
                  variant="primary"
                  className="w-full justify-center text-xs bg-emerald-600 hover:bg-emerald-700"
                  disabled={syncLoading || !inputSyncCode.trim()}
                  onClick={handleApplySyncCode}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  {syncLoading ? 'Đang đồng bộ...' : 'Áp dụng & Tải toàn bộ dữ liệu'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUPABASE CLOUD DATABASE CONFIG */}
        {activeTab === 'cloud' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {isCloudConnected ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <CloudOff className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Trạng thái kết nối Cloud: {isCloudConnected ? '🟢 Đã kết nối Supabase Online' : '⚪ Chưa kết nối (Chạy Offline)'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isCloudConnected
                      ? 'Tất cả dữ liệu được lưu trên đám mây Supabase an toàn và tự động cập nhật đa thiết bị.'
                      : 'Kết nối tài khoản Supabase miễn phí của bạn để tự động đồng bộ tức thì mọi lúc mọi nơi.'}
                  </p>
                </div>
              </div>

              {isCloudConnected && (
                <Button
                  size="xs"
                  variant="outline"
                  className="text-rose-600 dark:text-rose-400"
                  onClick={handleClearCloudConfig}
                >
                  Ngắt kết nối
                </Button>
              )}
            </div>

            <Card title="Cấu hình kết nối Supabase Cloud trực tiếp" className="p-4">
              <form onSubmit={handleSaveCloudConfig} className="space-y-3">
                <Input
                  label="Supabase Project URL"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  required
                />
                <Input
                  type="password"
                  label="Supabase Anon Key"
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  required
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Chưa có tài khoản? Đăng ký miễn phí tại <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">supabase.com</a>
                  </span>
                  <Button
                    type="submit"
                    size="xs"
                    variant="primary"
                    leftIcon={<Database className="w-3.5 h-3.5" />}
                  >
                    Kiểm tra & Lưu kết nối Cloud
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default AccountManagementModal;
