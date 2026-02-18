import React, { useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, isFirebaseConfigured } from '../firebase';

type LoginResult = { token: string; userId: string };

const LoginV2: React.FC = () => {
  const [companyId, setCompanyId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return;

    setError('');
    setLoading(true);

    try {
      const callable = httpsCallable(functions, 'loginWithPassword');
      const result = await callable({
        companyId: companyId.trim(),
        username: username.trim(),
        password
      });

      const data = result.data as LoginResult;
      if (!data?.token) {
        setError('Falha no login.');
        return;
      }

      await signInWithCustomToken(auth, data.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao efetuar login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">AnPort</h1>
        <p className="text-slate-400 mt-1">Login V2</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Empresa</label>
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: TESTCORP"
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Usuário</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: ceo"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-extrabold uppercase tracking-wider rounded-xl px-4 py-3"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginV2;
