import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2,
  FileText,
  GraduationCap,
  Mail,
  Save,
  User,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { analyticsService } from '../../services/analyticsService';
import { settingsService } from '../../services/settingsService';
import { AnalyticsSummary } from '../../types/analytics';
import { UserProfile } from '../../types/settings';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    toast.success('Đã cập nhật hồ sơ cá nhân thành công');
  };

  if (!profile) return null;

  const isHighSchool = (profile.educationLevel || educationLevel) === 'high_school';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header Profile Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-950/40">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
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
                  {profile.school} • {profile.gradeOrYear || (isHighSchool ? 'Lớp 12' : 'Năm 3')}
                </p>
              </div>

              <Button
                variant={isEditing ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <Badge variant="primary" size="sm" icon={<GraduationCap className="w-3.5 h-3.5" />}>
                {isHighSchool ? `Ban/Khối: ${profile.major}` : `Ngành: ${profile.major}`}
              </Badge>
              <Badge variant="neutral" size="sm">
                {isHighSchool ? `Mã HS: ${profile.studentId}` : `MSSV: ${profile.studentId}`}
              </Badge>
              <Badge variant="neutral" size="sm" icon={<Mail className="w-3.5 h-3.5" />}>
                {profile.email}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 max-w-2xl">
              "{profile.bio}"
            </p>
          </div>
        </div>
      </Card>

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
    </div>
  );
};
