import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, getFriendlyAuthErrorMessage } from '../auth/authService';
import { Bot, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Password criteria check
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authService.signUpWithEmail(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(getFriendlyAuthErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(getFriendlyAuthErrorMessage(err.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-background text-primaryText font-sans select-none overflow-hidden">
      {/* LEFT: Platform Showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-panel/40 border-r border-border/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#202B38_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-primaryText">SEAM</span>
              <span className="ml-2 text-xs font-mono uppercase text-accent font-semibold px-2 py-0.5 rounded bg-accent/15 border border-accent/30">
                IDE
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs text-secondaryText mb-4">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Developer Workspace Creation</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primaryText leading-tight">
              Build production software with an autonomous agent team.
            </h1>
            <p className="mt-3 text-sm text-secondaryText leading-relaxed">
              Join SEAM to write code paired with specialized AI agents executing analysis, architecture, testing, and Docker deployments autonomously.
            </p>
          </motion.div>

          <div className="space-y-2.5 pt-2 text-xs text-secondaryText">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Full Monaco IDE paired with live code generation</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Strictly sandboxed physical project filesystem</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Real Docker runtime build & dynamic host port forwarding</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-secondaryText/60 font-mono">
          SEAM Autonomous AI Engineering System • v0.1.0
        </div>
      </div>

      {/* RIGHT: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md bg-panel border border-border/80 rounded-xl p-8 shadow-2xl relative z-10 my-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primaryText tracking-tight">Create your workspace</h2>
            <p className="text-xs text-secondaryText mt-1">
              Start building autonomous applications with SEAM
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-secondaryText mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-secondaryText absolute left-3 top-3" />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Karthik Developer"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-primaryText placeholder:text-secondaryText/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondaryText mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-secondaryText absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-primaryText placeholder:text-secondaryText/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondaryText mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondaryText absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-primaryText placeholder:text-secondaryText/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              {password && (
                <div className="mt-1.5 flex gap-3 text-[10px] text-secondaryText">
                  <span className={hasMinLength ? 'text-success' : 'text-secondaryText/60'}>
                    ✓ 6+ characters
                  </span>
                  <span className={hasNumber ? 'text-success' : 'text-secondaryText/60'}>
                    ✓ number
                  </span>
                  <span className={hasUpper ? 'text-success' : 'text-secondaryText/60'}>
                    ✓ uppercase
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-secondaryText mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondaryText absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-primaryText placeholder:text-secondaryText/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-accent/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-panel px-3 text-secondaryText/70">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            className="w-full bg-background hover:bg-secondary text-primaryText border border-border font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 text-sm transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="mt-5 text-center text-xs text-secondaryText">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
