import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import './Auth.css';

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ username: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setFormData(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error("Parollar mos kelmadi!");
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      toast.success(res.data.message);
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik!');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-[#0a0e17] p-4 font-sans overflow-hidden relative">
      {/* Background blobs (Admin Panel style) */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#6366f1]/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] bg-[#06b6d4]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Language switcher */}
      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-[500px]"
      >
        <div className="p-8 md:p-10 bg-[#131826]/80 backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-2xl">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-[linear-gradient(135deg,#6366f1,#06b6d4)] flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
              <Zap size={22} className="text-[#ffffff] fill-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-[#ffffff]">Elektronikachi</div>
              <div className="text-[11px] text-[#94a3b8] uppercase tracking-widest">{t('auth.smart_devices', 'Aqlli Qurilmalar')}</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-extrabold text-[#ffffff] mb-2">
            {t('auth.register_title')}
          </h1>
          <p className="text-[13px] text-[#94a3b8] mb-8">
            {t('auth.sign_up_desc')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.username')}</label>
              <Input icon={User} type="text" placeholder="Ism familiyangiz" onChange={set('username')} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.email')}</label>
                <Input icon={Mail} type="email" placeholder="email@example.com" onChange={set('email')} required />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.phone')}</label>
                <Input icon={Phone} type="text" placeholder="+998901234567" onChange={set('phone')} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.password')}</label>
                <Input icon={Lock} type="password" placeholder="••••••••" onChange={set('password')} required />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.confirm_password')}</label>
                <Input icon={Lock} type="password" placeholder="••••••••" onChange={set('confirmPassword')} required />
              </div>
            </div>

            <div className="pt-4">
              <Button loading={loading} type="submit" variant="primary" className="auth-primary-btn w-full h-11 text-[15px]">
                {t('auth.register_btn')}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
            <span className="text-[#64748b] text-[11px] uppercase tracking-widest">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
          </div>

          {/* Google */}
          <div>
            <button
              type="button"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`}
              className="auth-google-btn w-full flex items-center justify-center gap-3 h-11 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] rounded-xl text-[#ffffff] text-[14px] font-medium transition-all"
            >
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="google" />
              {t('auth.google_login')}
            </button>
          </div>

          {/* Login link */}
          <div className="mt-8 text-center text-[13px]">
            <span className="text-[#94a3b8]">{t('auth.have_account')} </span>
            <button
              onClick={() => navigate('/login')}
              className="text-[#818cf8] font-medium hover:text-[#a5b4fc] transition-colors"
            >
              {t('auth.go_login')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
