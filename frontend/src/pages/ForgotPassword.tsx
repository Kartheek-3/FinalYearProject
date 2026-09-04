import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, getFriendlyAuthErrorMessage } from '../auth/authService';
import { Bot, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(getFriendlyAuthErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background text-primaryText font-sans p-6 select-none">
      <div className="w-full max-w-md bg-panel border border-border/80 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg">SEAM</span>
            <span className="text-xs text-secondaryText block">Password Recovery</span>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sm mb-1">Reset email dispatched</span>
                We have sent a secure password reset link to <strong className="font-mono">{email}</strong>. Please check your inbox and follow the instructions.
              </div>
            </div>

            <Link
              to="/login"
              className="w-full bg-secondary hover:bg-border text-primaryText font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-primaryText tracking-tight">Reset Password</h2>
              <p className="text-xs text-secondaryText mt-1">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-secondaryText mb-1.5 uppercase tracking-wider">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-accent/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-secondaryText hover:text-primaryText inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
