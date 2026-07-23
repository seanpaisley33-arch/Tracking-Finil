'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-700/60 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 shadow-inner">
            <Lock className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight">Restricted Admin Portal</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">SECURE ROUTE ACCESS &bull; PASSWORD REQUIRED</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-sm mb-6 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Admin Email</label>
            <input
              type="email"
              required
              placeholder="admin@tracking.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white placeholder-slate-600 font-mono text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Admin Security Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white placeholder-slate-600 font-mono text-sm transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 mt-4 text-sm tracking-wide uppercase"
          >
            {loading ? 'Verifying Password...' : 'Unlock Admin Dashboard'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}
