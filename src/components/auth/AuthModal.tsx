import React, { useState } from 'react';
import {
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  LogIn,
  Mail,
  School,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const { triggerDataRefresh } = useStudy();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'university'>('university');
  const [gradeOrYear, setGradeOrYear] = useState('Năm 2');
  const [school, setSchool] = useState('');

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setShowPassword(false);
  };

  const handleEducationChange = (level: 'high_school' | 'university') => {
    setEducationLevel(level);
    if (level === 'high_school') {
      setGradeOrYear('Lớp 12');
      if (!school || school === 'Đại học Bách Khoa') {
        setSchool('THPT Chuyên Lê Hồng Phong');
      }
    } else {
      setGradeOrYear('Năm 2');
      if (!school || school === 'THPT Chuyên Lê Hồng Phong') {
        setSchool('Đại học Bách Khoa');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      toast.error('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email.trim(), password);
        toast.success(`Chào mừng ${res.user.name || 'bạn'} quay trở lại StudyOS!`);
      } else {
        const res = await authService.register({
          email: email.trim(),
          password,
          name: name.trim(),
          educationLevel,
          gradeOrYear,
          school: school.trim() || (educationLevel === 'high_school' ? 'Trường THPT' : 'Trường Đại học'),
          major: educationLevel === 'high_school' ? 'Khối Tự nhiên' : 'Khoa học Máy tính',
        });
        toast.success(`Đăng ký tài khoản thành công! Xin chào ${res.user.name}`);
      }
      triggerDataRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Thao tác không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
    >
      <div className="pt-1 space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-1 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {mode === 'login' ? 'Đăng nhập vào StudyOS' : 'Tạo tài khoản học tập mới'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Hệ điều hành học tập cá nhân hóa & trợ lý gia sư AI 24/7'
              : 'Thiết lập không gian học tập thông minh dành riêng cho bạn'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('register')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo tài khoản mới</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              {/* Persona Switch: Cấp 3 vs Đại học */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Đối tượng học tập
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEducationChange('high_school')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      educationLevel === 'high_school'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <School className="w-4 h-4" />
                    <span>Học sinh Cấp 3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEducationChange('university')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      educationLevel === 'university'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Sinh viên Đại học</span>
                  </button>
                </div>
              </div>

              <Input
                label="Họ và tên"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nguyễn Văn An"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {educationLevel === 'high_school' ? 'Khối lớp' : 'Năm học'}
                  </label>
                  <select
                    value={gradeOrYear}
                    onChange={e => setGradeOrYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {educationLevel === 'high_school' ? (
                      <>
                        <option value="Lớp 10">Lớp 10</option>
                        <option value="Lớp 11">Lớp 11</option>
                        <option value="Lớp 12">Lớp 12 (Luyện thi THPT)</option>
                      </>
                    ) : (
                      <>
                        <option value="Năm 1">Năm 1 (Tân sinh viên)</option>
                        <option value="Năm 2">Năm 2</option>
                        <option value="Năm 3">Năm 3</option>
                        <option value="Năm 4">Năm 4 / Năm cuối</option>
                        <option value="Sau ĐH">Học viên Cao học</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <Input
                    label={educationLevel === 'high_school' ? 'Trường THPT' : 'Trường ĐH'}
                    value={school}
                    onChange={e => setSchool(e.target.value)}
                    placeholder={educationLevel === 'high_school' ? 'THPT Chuyên...' : 'ĐH Bách Khoa...'}
                  />
                </div>
              </div>
            </>
          )}

          <Input
            type="email"
            label="Địa chỉ Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="student@studyos.edu.vn"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mật khẩu
              </label>
              {mode === 'register' && (
                <span className="text-[10px] text-slate-400">Tối thiểu 6 ký tự</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 text-xs font-semibold shadow-sm"
              disabled={loading}
              leftIcon={
                mode === 'login' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )
              }
            >
              {loading
                ? 'Đang xử lý...'
                : mode === 'login'
                ? 'Đăng nhập vào StudyOS'
                : 'Hoàn tất đăng ký tài khoản'}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors"
              >
                {mode === 'login'
                  ? 'Chưa có tài khoản? Nhấn để tạo tài khoản mới'
                  : 'Đã có tài khoản? Quay lại màn hình đăng nhập'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
