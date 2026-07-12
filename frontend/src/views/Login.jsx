import React, { useState } from 'react';
import { api } from '../api';
import { Truck, ShieldAlert, BadgeDollarSign, UserCheck, Key, Mail, User } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('FleetManager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.auth.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.auth.register(name, email, password, role);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail) => {
    setError('');
    setLoading(true);
    try {
      const user = await api.auth.login(roleEmail, 'password');
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height-screen flex flex-col md:flex-row bg-bg-warm relative overflow-hidden">
      {/* Decorative honeycomb background */}
      <div className="absolute inset-0 honeycomb-pattern pointer-events-none" />

      {/* Left Branding Panel */}
      <div className="w-full md:w-5/12 bg-hive-black text-white p-8 md:p-12 flex flex-col justify-between relative z-10 border-b md:border-b-0 md:border-r border-honey-beige/20 shadow-premium">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-honey-gold rounded-lg flex items-center justify-center shadow-md">
            <Truck className="text-hive-black w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-wider text-honey-gold uppercase">EcoFleet</span>
            <span className="block text-xs text-honey-beige/80">Fleet Management System</span>
          </div>
        </div>

        <div className="my-12 md:my-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-white mb-6">
            Intelligent <br />
            <span className="text-honey-gold">Fleet Operations</span> <br />
            Simplified.
          </h1>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed max-w-sm">
            Real-time tracking, compliance monitoring, maintenance coordination, and financial intelligence in one premium platform.
          </p>
        </div>

        <div className="text-xs text-honey-beige/60">
          &copy; {new Date().getFullYear()} EcoFleet. Honeybee Premium Edition.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center relative z-10">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-hive-black tracking-tight">
              {isRegister ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {isRegister ? 'Register user details to get started.' : 'Enter your credentials or choose a quick login role below.'}
            </p>
          </div>

          {error && (
            <div className="bg-danger-red/10 border border-danger-red/30 text-danger-red text-xs rounded-xl p-3 mb-6 font-medium">
              {error}
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@ecofleet.in"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-honey-gold hover:bg-honey-dark text-hive-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-center cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rajesh Sharma"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@ecofleet.in"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                >
                  <option value="FleetManager">Fleet Manager</option>
                  <option value="SafetyOfficer">Safety Officer</option>
                  <option value="FinancialAnalyst">Financial Analyst</option>
                  <option value="Driver">Driver Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Confirm Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-3 text-text-secondary w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-honey-beige bg-white text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-honey-gold focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-honey-gold hover:bg-honey-dark text-hive-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-center cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Sign Up & Login'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-honey-dark hover:underline text-xs font-bold cursor-pointer font-semibold"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>

          {/* Quick Login Division */}
          {!isRegister && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-honey-beige"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-bg-warm px-3 font-semibold text-text-secondary">Demo Quick Logins</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickLogin('manager@ecofleet.in')}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-honey-beige/25 border border-honey-beige rounded-xl transition-all text-left group shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-honey-gold/15 flex items-center justify-center text-honey-dark group-hover:bg-honey-gold group-hover:text-white transition-all">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-hive-black">Fleet Manager</span>
                    <span className="block text-[10px] text-text-secondary">Admin Access</span>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickLogin('safety@ecofleet.in')}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-honey-beige/25 border border-honey-beige rounded-xl transition-all text-left group shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-warning-orange/15 flex items-center justify-center text-warning-orange group-hover:bg-warning-orange group-hover:text-white transition-all">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-hive-black">Safety Officer</span>
                    <span className="block text-[10px] text-text-secondary">Compliance</span>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickLogin('finance@ecofleet.in')}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-honey-beige/25 border border-honey-beige rounded-xl transition-all text-left group shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-success-green/15 flex items-center justify-center text-success-green group-hover:bg-success-green group-hover:text-white transition-all">
                    <BadgeDollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-hive-black">Financial Analyst</span>
                    <span className="block text-[10px] text-text-secondary">Analytics & Logs</span>
                  </div>
                </button>

                <button
                  onClick={() => handleQuickLogin('driver@ecofleet.in')}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-honey-beige/25 border border-honey-beige rounded-xl transition-all text-left group shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-hive-black/10 flex items-center justify-center text-hive-black group-hover:bg-hive-black group-hover:text-white transition-all">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-hive-black">Driver Portal</span>
                    <span className="block text-[10px] text-text-secondary">My Assigned Trips</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
