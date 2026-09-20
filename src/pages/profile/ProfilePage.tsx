import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Edit2,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useStudy } from '../../context/StudyContext';
import { analyticsService } from '../../services/analyticsService';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
import { AnalyticsSummary } from '../../types/analytics';
import { UserProfile } from '../../types/settings';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { UserAvatar } from '../../components/common/UserAvatar';

const PRESET_AVATARS = [
  {
    id: 'preset-1',
    label: 'Sinh viên Năng động',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-2',
    label: 'Học sinh Chăm chỉ',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-3',
    label: 'Kỹ sư Trẻ',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-4',
    label: 'Nữ sinh Chuyên cần',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-5',
    label: 'Coder & Công nghệ',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-6',
    label: 'Khối Tự nhiên',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-7',
    label: 'Nghệ thuật & Sáng tạo',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-8',
    label: 'Khoa học & Vũ trụ',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=250&auto=format&fit=crop&q=80',
  },
];

function resizeImage(file: File, maxWidth = 256, maxHeight = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Không thể xử lý hình ảnh'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const { triggerDataRefresh, setIsAccountModalOpen } = useStudy();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form states
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'university'>('university');
  const [gradeOrYear, setGradeOrYear] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [studentId, setStudentId] = useState('');
  const [bio, setBio] = useState('');

  const loadData = async () => {
    const [settings, sum] = await Promise.all([
      settingsService.getSettings(),
      analyticsService.getSummary(),
    ]);

    setProfile(settings.profile);
    setSummary(sum);

    setEducationLevel(settings.profile.educationLevel || 'university');
    setGradeOrYear(settings.profile.gradeOrYear || (settings.profile.educationLevel === 'high_school' ? 'Lớp 12' : 'Năm 3'));
    setName(settings.profile.name);
    setEmail(settings.profile.email);
    setSchool(settings.profile.school);
    setMajor(settings.profile.major);
    setStudentId(settings.profile.studentId);
    setBio(settings.profile.bio);
    setSelectedAvatar(settings.profile.avatarUrl || '');
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await settingsService.updateProfile({
      educationLevel,
      gradeOrYear,
      name,
      email,
      school,
      major,
      studentId,
      bio,
    });
    setProfile(updated);
    setIsEditing(false);
    triggerDataRefresh();
    toast.success('Đã cập nhật hồ sơ cá nhân thành công');
  };

  const handleSaveAvatar = async () => {
    try {
      const avatarToSave = customUrlInput.trim() ? customUrlInput.trim() : selectedAvatar;
      await settingsService.updateProfile({ avatarUrl: avatarToSave });
      await authService.updateProfile({ avatarUrl: avatarToSave });
      setProfile(prev => prev ? { ...prev, avatarUrl: avatarToSave } : null);
      setIsAvatarModalOpen(false);
      setCustomUrlInput('');
      triggerDataRefresh();
      toast.success('Đã cập nhật ảnh đại diện thành công');
    } catch (err: any) {
      toast.error('Lỗi khi cập nhật ảnh đại diện');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
      return;
    }

    setUploadLoading(true);
    try {
      const resizedBase64 = await resizeImage(file, 256, 256);
      setSelectedAvatar(resizedBase64);
      setCustomUrlInput('');
      toast.success('Đã tải và tối ưu ảnh đại diện');
    } catch (err) {
      toast.error('Không thể tải ảnh. Vui lòng thử ảnh khác');
    } finally {
      setUploadLoading(false);
    }
  };

  if (!profile) return null;

  const isHighSchool = (profile.educationLevel || educationLevel) === 'high_school';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header Profile Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Camera Trigger */}
          <div className="relative group flex-shrink-0">
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              size="2xl"
              className="ring-4 ring-indigo-50 dark:ring-indigo-950/40 shadow-lg"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar(profile.avatarUrl || '');
                setIsAvatarModalOpen(true);
              }}
              className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 backdrop-blur-[2px] cursor-pointer"
              title="Thay đổi ảnh đại diện"
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Đổi ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar(profile.avatarUrl || '');
                setIsAvatarModalOpen(true);
              }}
              className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors cursor-pointer"
              title="Thay đổi ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {profile.name}
                  </h2>
                  <Badge variant={isHighSchool ? 'warning' : 'primary'} size="sm">
                    {isHighSchool ? 'Học sinh Cấp 3' : 'Sinh viên Đại học'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {profile.school || (isHighSchool ? 'Trường THPT' : 'Trường Đại học')} • {profile.gradeOrYear || (isHighSchool ? 'Lớp 12' : 'Năm 3')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAccountModalOpen(true)}
                  leftIcon={<Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                >
                  Quản lý tài khoản
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAvatar(profile.avatarUrl || '');
                    setIsAvatarModalOpen(true);
                  }}
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                >
                  Đổi ảnh
                </Button>
                <Button
                  variant={isEditing ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <Badge variant="primary" size="sm" icon={<GraduationCap className="w-3.5 h-3.5" />}>
                {isHighSchool ? `Ban/Khối: ${profile.major || 'Chưa thiết lập'}` : `Ngành: ${profile.major || 'Chưa thiết lập'}`}
              </Badge>
              <Badge variant="neutral" size="sm">
                {isHighSchool ? `Mã HS: ${profile.studentId || 'Chưa có'}` : `MSSV: ${profile.studentId || 'Chưa có'}`}
              </Badge>
              <Badge variant="neutral" size="sm" icon={<Mail className="w-3.5 h-3.5" />}>
                {profile.email || 'Chưa đăng ký email'}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 max-w-2xl">
              "{profile.bio || 'Chưa có tiểu sử học tập.'}"
            </p>
          </div>
        </div>
      </Card>

      {/* Multi-device Sync Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              Đồng bộ dữ liệu sang Điện thoại hoặc Máy tính khác
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Tạo mã đồng bộ 5 giây hoặc kết nối Supabase Cloud để dữ liệu tự động cập nhật thời gian thực trên mọi thiết bị.
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsAccountModalOpen(true)}
          className="flex-shrink-0"
          leftIcon={<Users className="w-3.5 h-3.5" />}
        >
          Quản lý tài khoản & Đồng bộ
        </Button>
      </div>

      {/* Profile Edit Form */}
      {isEditing && (
        <Card title={isHighSchool ? 'Chỉnh sửa thông tin học sinh' : 'Chỉnh sửa thông tin sinh viên'} className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Education Level Switcher */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Đối tượng sử dụng chính:
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Hệ thống sẽ điều chỉnh thuật ngữ, môn học và tiêu chí phù hợp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEducationLevel('high_school');
                    if (school.includes('Đại học')) setSchool('Trường THPT Chuyên');
                    if (major.includes('Khoa học')) setMajor('Khối A00 (Toán, Lý, Hóa)');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    educationLevel === 'high_school'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🎒 Học sinh Cấp 3 (THPT)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEducationLevel('university');
                    if (school.includes('THPT')) setSchool('Trường Đại học Bách Khoa');
                    if (major.includes('Khối')) setMajor('Công nghệ Thông tin');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    educationLevel === 'university'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🎓 Sinh viên Đại học / Cao đẳng
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Họ và tên"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                label="Địa chỉ Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label={educationLevel === 'high_school' ? 'Trường THPT' : 'Trường Đại học / Cao đẳng'}
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  placeholder={educationLevel === 'high_school' ? 'VD: Trường THPT Chuyên Lê Hồng Phong' : 'VD: Trường Đại học Bách Khoa'}
                  required
                />
              </div>
              <Input
                label={educationLevel === 'high_school' ? 'Mã số học sinh' : 'Mã số sinh viên (MSSV)'}
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder={educationLevel === 'high_school' ? 'VD: HS1205' : 'VD: 20235678'}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={educationLevel === 'high_school' ? 'Lớp học (Khối lớp)' : 'Khóa / Niên khóa'}
                value={gradeOrYear}
                onChange={e => setGradeOrYear(e.target.value)}
                placeholder={educationLevel === 'high_school' ? 'VD: Lớp 12A1 (Khối 12)' : 'VD: K22 - Năm 3'}
                required
              />
              <Input
                label={educationLevel === 'high_school' ? 'Khối thi / Ban học định hướng' : 'Chuyên ngành đào tạo'}
                value={major}
                onChange={e => setMajor(e.target.value)}
                placeholder={educationLevel === 'high_school' ? 'VD: Khối A00 (Toán, Lý, Hóa)' : 'VD: Khoa học Máy tính'}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tiểu sử & Mục tiêu học tập
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
                Lưu thông tin
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Study Stats Summary Grid */}
      {summary && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 px-1">
            Tổng quan số liệu học tập của tài khoản
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="!p-4 text-center">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block">
                {summary.totalQuestionsAnswered}
              </span>
              <span className="text-xs text-slate-400 font-medium">Câu hỏi trắc nghiệm</span>
            </Card>

            <Card className="!p-4 text-center">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
                {summary.overallAccuracyRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">Độ chính xác trung bình</span>
            </Card>

            <Card className="!p-4 text-center">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
                {summary.totalFlashcardsLearned}
              </span>
              <span className="text-xs text-slate-400 font-medium">Thẻ Flashcard đã thuộc</span>
            </Card>

            <Card className="!p-4 text-center">
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block">
                {summary.completedTopicsCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">Chủ đề hoàn thành</span>
            </Card>
          </div>
        </div>
      )}

      {/* Avatar Customization Modal */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => {
          setIsAvatarModalOpen(false);
          setCustomUrlInput('');
        }}
        title="Tùy chỉnh ảnh đại diện"
        size="lg"
      >
        <div className="space-y-5 pt-2">
          {/* Live Preview Box */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <UserAvatar
              avatarUrl={customUrlInput.trim() ? customUrlInput.trim() : selectedAvatar}
              name={name || profile.name}
              size="xl"
              className="ring-4 ring-white dark:ring-slate-800 shadow-md"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Xem trước ảnh đại diện
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ảnh đại diện sẽ hiển thị trên thanh điều hướng, góc cá nhân và các bài thi của bạn.
              </p>
            </div>
          </div>

          {/* Quick Options: Default Icon vs Name Initials */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              1. Tùy chọn cơ bản (Icon hoặc Chữ cái theo tên)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedAvatar('icon:user');
                  setCustomUrlInput('');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  selectedAvatar === 'icon:user' && !customUrlInput
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Icon người dùng mặc định</span>
                {selectedAvatar === 'icon:user' && !customUrlInput && <Check className="w-4 h-4 ml-auto text-indigo-600 dark:text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAvatar('');
                  setCustomUrlInput('');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  !selectedAvatar && !customUrlInput
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                  {name ? name.slice(0, 1).toUpperCase() : 'H'}
                </div>
                <span>Chữ cái viết tắt theo tên</span>
                {!selectedAvatar && !customUrlInput && <Check className="w-4 h-4 ml-auto text-indigo-600 dark:text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* Preset Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              2. Chọn ảnh mẫu sinh viên / học sinh
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedAvatar === preset.url && !customUrlInput;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(preset.url);
                      setCustomUrlInput('');
                    }}
                    className={`relative p-1 rounded-2xl border transition-all flex flex-col items-center group cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/50'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    title={preset.label}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload File or Enter URL */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              3. Hoặc tải ảnh từ thiết bị / nhập liên kết ảnh
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-center text-xs"
                disabled={uploadLoading}
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {uploadLoading ? 'Đang nén ảnh...' : 'Tải ảnh từ máy'}
              </Button>

              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <input
                  type="url"
                  placeholder="Dán URL ảnh (https://...)"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    if (e.target.value) setSelectedAvatar('');
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAvatarModalOpen(false);
                setCustomUrlInput('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveAvatar}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Lưu ảnh đại diện
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
