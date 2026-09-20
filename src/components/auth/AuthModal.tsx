import React, { useState } from 'react';
import { Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useStudy } from '../../context/StudyContext';
import { authService } from '../../services/authService';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email, password);
        toast.success(`Chào mừng ${res.user.name} quay trở lại!`);
      } else {
        const res = await authService.register({
          email,
          password,
          name,
          school: school || 'Đại học Bách Khoa',
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
      title={mode === 'login' ? 'Đăng nhập vào StudyOS' : 'Tạo tài khoản học tập mới'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {mode === 'register' && (
          <>
            <Input
              label="Họ và tên"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nguyễn Văn An"
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Trường Đại học"
              value={school}
              onChange={e => setSchool(e.target.value)}
              placeholder="Đại học Bách Khoa"
            />
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

        <Input
          type="password"
          label="Mật khẩu"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          required
        />

        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            disabled={loading}
            leftIcon={mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          >
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 pt-1 transition-colors"
          >
            {mode === 'login'
              ? 'Chưa có tài khoản? Nhấn để đăng ký'
              : 'Đã có tài khoản? Quay lại đăng nhập'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
