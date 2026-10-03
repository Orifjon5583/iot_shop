import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Lock, Zap } from 'lucide-react';
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

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const identifier = email.trim() || phone.trim();
    if (!identifier) {
      return toast.error(t('auth.err_identifier'));
    }
    if (!password) {
      return toast.error(t('auth.err_password'));
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      toast.success(res.data.message);
      navigate('/verify-otp', { state: { email: res.data.email || email } });
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.err_login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-[#0a0e17] relative overflow-hidden font-sans p-4">
      {/* Background blobs (Admin Panel style) */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#6366f1]/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] bg-[#06b6d4]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="p-8 md:p-10 bg-[#131826]/80 backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-2xl">
          
          {/* Logo (Matching Admin Panel) */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-[linear-gradient(135deg,#6366f1,#06b6d4)] flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
              <Zap size={22} className="text-[#ffffff] fill-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-[#ffffff]">Elektronikachi</div>
              <div className="text-[11px] text-[#94a3b8] uppercase tracking-widest">{t('auth.smart_devices')}</div>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-[#ffffff] mb-2">
            {t('auth.login_title')}
          </h1>
          <p className="text-[13px] text-[#94a3b8] mb-8">
            {t('auth.sign_in_desc')}
          </p>

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.email')} {t('auth.or_lowercase')} {t('auth.phone')}</label>
              <Input
                icon={Mail}
                type="text"
                placeholder="email@example.com / +998901234567"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@') || /[a-zA-Z]/.test(val)) {
                    setEmail(val); setPhone('');
                  } else {
                    setPhone(val); setEmail('');
                  }
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[13px] font-medium text-[#cbd5e1] ml-1">{t('auth.password')}</label>
              <Input
                icon={Lock}
                type="password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <Button loading={loading} type="submit" variant="primary" className="auth-primary-btn w-full h-11 text-[15px]">
                {t('auth.login_btn')}
              </Button>
            </div>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
            <span className="text-[#64748b] text-[11px] uppercase tracking-widest">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
          </div>

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

          <div className="mt-8 text-center text-[13px]">
            <span className="text-[#94a3b8]">{t('auth.no_account')} </span>
            <button
              onClick={() => navigate('/register')}
              className="text-[#818cf8] font-medium hover:text-[#a5b4fc] transition-colors"
            >
              {t('auth.go_register')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
