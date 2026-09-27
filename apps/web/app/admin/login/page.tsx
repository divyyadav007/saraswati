"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        localStorage.setItem("auth_token", data.session.access_token);
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    localStorage.setItem("auth_token", "mock-admin-token");
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[var(--color-primary)] skew-y-[-5deg] transform origin-top-left -z-10 shadow-xl"></div>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 relative z-10 border border-stone-200">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🪔</div>
          <h1 className="text-3xl font-serif font-bold text-stone-800">Saraswati</h1>
          <p className="text-stone-500 font-medium uppercase tracking-widest text-xs mt-2">Admin Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors outline-none"
              placeholder="admin@saraswatisweets.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:bg-maroon-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-md disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </button>
        </form>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 pt-6 border-t border-stone-200">
            <p className="text-xs text-stone-500 text-center mb-4 uppercase tracking-wider font-semibold">Development Mode</p>
            <button
              onClick={handleDevBypass}
              className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              Bypass Auth (Mock Admin)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

