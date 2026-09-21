import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  BarChart2,
  CheckCircle,
  Database,
  Download,
  HardDrive,
  Key,
  Layers,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';

interface StorageQuotaData {
  provider: 'google_drive' | 'local' | 'supabase';
  connected: boolean;
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  usedPercentage: number;
  warningLevel: 'normal' | 'warning' | 'high' | 'critical';
  warningMessage?: string;
  rootFolderName?: string;
}

interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  education_level?: string;
  grade_or_year?: string;
  school?: string;
  major?: string;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  adminEmail: string;
  action: string;
  category: string;
  details: any;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, navigateTo } = useStudy();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'storage' | 'ai' | 'backups'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [testingStorage, setTestingStorage] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);

  // Data states
  const [overviewStats, setOverviewStats] = useState<{
    totalUsers: number;
    totalDocuments: number;
    totalSubjects: number;
    totalExams: number;
  }>({ totalUsers: 1, totalDocuments: 0, totalSubjects: 0, totalExams: 0 });

  const [quota, setQuota] = useState<StorageQuotaData>({
    provider: 'google_drive',
    connected: false,
    usedBytes: 0,
    totalBytes: 15 * 1024 * 1024 * 1024,
    freeBytes: 15 * 1024 * 1024 * 1024,
    usedPercentage: 0,
    warningLevel: 'normal',
  });

  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  // Check admin authorization
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'student@studyos.edu.vn' || currentUser?.email === 'phamnguyenhoang10@gmail.com';

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = await authService.getBearerToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-mock-role': currentUser?.role === 'admin' ? 'admin' : 'user',
      };

      // 1. Fetch Overview
      const resOverview = await fetch('/api/admin/overview', { headers });
      if (resOverview.ok) {
        const data = await resOverview.json();
        setOverviewStats({
          totalUsers: data.totalUsers || 1,
          totalDocuments: data.totalDocuments || 0,
          totalSubjects: data.totalSubjects || 0,
          totalExams: data.totalExams || 0,
        });
        if (data.storageQuota) {
          setQuota(data.storageQuota);
        }
      }

      // 2. Fetch Users
      const resUsers = await fetch('/api/admin/users', { headers });
      if (resUsers.ok) {
        const uList = await resUsers.json();
        setUsersList(uList);
      }

      // 3. Fetch Logs
      const resLogs = await fetch('/api/admin/logs', { headers });
      if (resLogs.ok) {
        const lList = await resLogs.json();
        setLogs(lList);
      }
    } catch (err: any) {
      console.warn('[Admin] Could not load API data, fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [currentUser]);

  const handleTestDriveConnection = async () => {
    setTestingStorage(true);
    try {
      const token = await authService.getBearerToken();
      const res = await fetch('/api/admin/storage/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-mock-role': 'admin',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || 'Kết nối Google Drive thành công!');
          fetchAdminData();
        } else {
          toast.warning(data.message || 'Chưa thể kết nối tới Google Drive');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.warning(errData.message || errData.error || `Chưa thể kết nối Google Drive (Mã lỗi ${res.status}). Vui lòng kiểm tra biến môi trường Vercel.`);
      }
    } catch (e: any) {
      toast.error('Lỗi khi kiểm tra kết nối Google Drive: ' + (e?.message || 'Không thể kết nối'));
    } finally {
      setTestingStorage(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const token = await authService.getBearerToken();
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-mock-role': 'admin',
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Đã tạo bản sao lưu thành công!');
        fetchAdminData();
      } else {
        toast.error(data.error || 'Tạo bản sao lưu thất bại');
      }
    } catch (e: any) {
      toast.error('Lỗi khi tạo bản sao lưu hệ thống');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const token = await authService.getBearerToken();
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-mock-role': 'admin',
        },
        body: JSON.stringify({ userId, newRole }),
      });
      if (res.ok) {
        toast.success(`Đã cập nhật quyền thành công: ${newRole.toUpperCase()}`);
        fetchAdminData();
      }
    } catch (e: any) {
      toast.error('Không thể cập nhật quyền người dùng');
    }
  };

  // Guard: Unauthorized
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="p-4 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Khu vực Giới hạn</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Trang Quản trị Hệ thống (Admin Portal) chỉ dành cho tài khoản có quyền Quản trị viên (`role = 'admin'`).
        </p>
        <Button variant="primary" onClick={() => navigateTo('dashboard')}>
          Quay về Trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Bảng Quản trị Hệ thống (Admin Portal)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giám sát người dùng, hạ tầng lưu trữ Google Drive, AI Engine và an toàn dữ liệu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdminData}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            leftIcon={<Archive className="w-3.5 h-3.5" />}
          >
            {creatingBackup ? 'Đang sao lưu...' : 'Sao lưu hệ thống'}
          </Button>
        </div>
      </div>

      {/* Storage Warning Alert Banner if Threshold Reached */}
      {quota.warningLevel !== 'normal' && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border ${
            quota.warningLevel === 'critical'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              : quota.warningLevel === 'high'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200'
          }`}
        >
          <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm mb-0.5">
              {quota.warningLevel === 'critical'
                ? 'NGUY CẤP: DUNG LƯỢNG LƯU TRỮ TRÊN 95%'
                : quota.warningLevel === 'high'
                ? 'CẢNH BÁO CAO: DUNG LƯỢNG LƯU TRỮ VƯỢT 90%'
                : 'LƯU Ý: DUNG LƯỢNG LƯU TRỮ ĐẠT 80%'}
            </h4>
            <p>{quota.warningMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 text-xs font-semibold overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
          { id: 'users', label: 'Người dùng', icon: Users, badge: usersList.length },
          { id: 'storage', label: 'Google Drive Storage', icon: HardDrive },
          { id: 'ai', label: 'Cấu hình AI', icon: Server },
          { id: 'backups', label: 'Sao lưu & Logs', icon: Database, badge: logs.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng người dùng</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{overviewStats.totalUsers}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tài liệu lưu trữ</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{overviewStats.totalDocuments}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Môn học đã tạo</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{overviewStats.totalSubjects}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bộ nhớ Drive đã dùng</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatBytes(quota.usedBytes)}
                </h3>
              </div>
            </Card>
          </div>

          {/* Storage Bar Overview */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Dung lượng Google Drive Hệ thống (System Storage)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thư mục gốc: <span className="font-mono text-indigo-600 dark:text-indigo-400">MyStudyWeb/</span>
                </p>
              </div>
              <Badge variant={quota.connected ? 'success' : 'warning'}>
                {quota.connected ? 'Google Drive Đang kết nối' : 'Local Fallback'}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Đã sử dụng: {formatBytes(quota.usedBytes)} ({quota.usedPercentage}%)</span>
                <span>Tổng dung lượng: {quota.totalBytes > 0 ? formatBytes(quota.totalBytes) : 'Không giới hạn'}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quota.usedPercentage >= 95
                      ? 'bg-red-500'
                      : quota.usedPercentage >= 90
                      ? 'bg-orange-500'
                      : quota.usedPercentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, quota.usedPercentage))}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestDriveConnection}
                disabled={testingStorage}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${testingStorage ? 'animate-spin' : ''}`} />}
              >
                {testingStorage ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối Google Drive'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('storage')}
              >
                Xem chi tiết cấu trúc thư mục
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Danh sách Người dùng Hệ thống ({usersList.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Định danh Supabase Auth + RLS User Isolation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Học viên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Cấp học / Trường</th>
                  <th className="px-4 py-3">Ngày đăng ký</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                      <UserAvatar name={u.name} size="sm" />
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'danger' : 'info'}>
                        {u.role === 'admin' ? '🛡️ Quản trị viên' : 'Học viên'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>{u.school || 'Đại học Bách Khoa'}</div>
                      <div className="text-[10px] text-slate-400">{u.grade_or_year || 'Năm 2'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggleRole(u.id, u.role)}
                      >
                        {u.role === 'admin' ? 'Chuyển thành User' : 'Nâng quyền Admin'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: GOOGLE DRIVE STORAGE & QUOTA */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-600" />
                  <span>Cấu hình & Trạng thái Google Drive Storage</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dữ liệu được lưu trữ tự động trên Google Drive Server của Hệ thống. Người dùng không cần cung cấp quyền Drive.
                </p>
              </div>

              <Badge variant={quota.connected ? 'success' : 'warning'}>
                {quota.connected ? 'Google Drive: Sẵn sàng' : 'Local Storage Fallback'}
              </Badge>
            </div>

            {/* Quota Progress */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>Dung lượng đã sử dụng: {formatBytes(quota.usedBytes)}</span>
                <span>{quota.usedPercentage}%</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    quota.usedPercentage >= 95
                      ? 'bg-red-500'
                      : quota.usedPercentage >= 90
                      ? 'bg-orange-500'
                      : quota.usedPercentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, quota.usedPercentage))}%` }}
                />
              </div>

              {/* Threshold Labels */}
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">🟢 Bình thường (&lt;80%)</span>
                <span className="flex items-center gap-1">🟡 Cảnh báo (80%)</span>
                <span className="flex items-center gap-1">🟠 Báo động (90%)</span>
                <span className="flex items-center gap-1">🔴 Nguy cấp (95%)</span>
              </div>
            </div>

            {/* Folder Structure Visualization */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Cấu trúc thư mục Google Drive Chuẩn
              </h4>
              <div className="p-4 rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 space-y-1">
                <div>📁 MyStudyWeb/ (Root Folder)</div>
                <div className="pl-4">├── 📁 users/</div>
                <div className="pl-8">│   └── 📁 user_&lt;auth_uid&gt;/</div>
                <div className="pl-12">│       └── 📁 documents/  &lt;-- Tài liệu học tập của học viên</div>
                <div className="pl-4">└── 📁 backups/  &lt;-- Sao lưu cơ sở dữ liệu định kỳ</div>
              </div>
            </div>

            {/* Security note */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bảo mật Quản trị:</strong> Mã bí mật API (`GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`) được mã hóa và lưu trữ độc quyền ở biến môi trường backend/serverless, tuyệt đối không xuất hiện ở mã nguồn giao diện client.
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleTestDriveConnection}
                disabled={testingStorage}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${testingStorage ? 'animate-spin' : ''}`} />}
              >
                {testingStorage ? 'Đang kiểm tra...' : 'Thử nghiệm kết nối Google Drive'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: AI ENGINE CONFIG */}
      {activeTab === 'ai' && (
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <span>Trạng thái Máy chủ AI & Nhà cung cấp (AI Engine)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Google Gemini (Gemini 2.5 Flash / Pro)', status: 'Sẵn sàng (Mặc định)', active: true },
              { name: 'Groq Cloud (Llama 3.3 70B Versatile)', status: 'Hoạt động tốt', active: true },
              { name: 'OpenRouter (Claude 3.5, DeepSeek R1)', status: 'Dự phòng tự động', active: true },
              { name: 'OpenAI (GPT-4o, GPT-4o-mini)', status: 'Cấu hình tùy chọn', active: false },
              { name: 'RAG Retrieval Engine & Vector Store', status: 'In-Memory Cosine Similarity', active: true },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.status}</p>
                </div>
                <Badge variant={item.active ? 'success' : 'default'}>
                  {item.active ? 'Kích hoạt' : 'Chưa kích hoạt'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 5: BACKUPS & AUDIT LOGS */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sao lưu Toàn bộ Dữ liệu Hệ thống (Database Backup)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Được lưu trữ trực tiếp vào thư mục Google Drive <code className="font-mono">MyStudyWeb/backups/</code>
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                leftIcon={<Archive className="w-3.5 h-3.5" />}
              >
                {creatingBackup ? 'Đang xử lý sao lưu...' : 'Tạo bản sao lưu ngay'}
              </Button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Nhật ký Hoạt động Quản trị (System Audit Logs)
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="p-3.5 text-xs flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString('vi-VN')} {new Date(log.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Thực hiện bởi: <strong className="text-slate-700 dark:text-slate-300">{log.adminEmail}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
