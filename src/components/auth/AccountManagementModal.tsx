import React, { useEffect, useState } from 'react';
import {
  Key,
  Lock,
  LogOut,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { authService, StoredAccount } from '../../services/authService';
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

  const [activeTab, setActiveTab] = useState<'profile' | 'accounts'>('profile');

  // Accounts list
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const reloadData = () => {
    setAccounts(authService.getRegisteredAccounts());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
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
      await authService.removeAccountFromDevice(targetId);
      toast.success(`Đã xóa tài khoản "${name}" khỏi thiết bị`);
      triggerDataRefresh();
      reloadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài khoản');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
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
              Quản lý tài khoản
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xem thông tin hồ sơ, đổi mật khẩu và chuyển đổi giữa các tài khoản
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
      </div>
    </Modal>
  );
};
export default AccountManagementModal;

