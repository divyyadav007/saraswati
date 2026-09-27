"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useCart } from "@/lib/cart-context";

type AuthView = "login" | "register" | "forgot_password" | "reset_password";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/profile";
  const { mergeGuestCart } = useCart();

  const [view, setView] = useState<AuthView>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  // Redirect if already logged in, or handle password recovery
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(returnTo);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset_password");
        setError(null);
        setSuccessMsg(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, returnTo, supabase]);

  const syncProfile = async (token: string, name?: string) => {
    try {
      await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1") + "/auth/sync-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: name || undefined
        })
      });
    } catch (e) {
      console.error("Failed to sync profile:", e);
    }
  };

  const handleAuthSuccess = async (token: string, name?: string) => {
    localStorage.setItem("auth_token", token);
    await syncProfile(token, name);
    await mergeGuestCart(token);
    router.push(returnTo);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
      if (data?.session) {
        await handleAuthSuccess(data.session.access_token);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Please fill all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (signUpError) throw signUpError;
      if (data?.session) {
        await handleAuthSuccess(data.session.access_token, fullName.trim());
      } else {
        setSuccessMsg("Registration successful! Please check your email to verify your account.");
        setView("login");
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });
      if (resetError) throw resetError;
      setSuccessMsg("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccessMsg("Password updated successfully. You can now login.");
      setView("login");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg text-[var(--color-accent-gold)]">
              <span className="text-3xl font-cursive">S</span>
            </div>
          </Link>
        </div>
        <h2 className="text-center text-3xl font-serif font-bold text-[#1F1B16]">
          {view === "login" && "Welcome Back"}
          {view === "register" && "Create an Account"}
          {view === "forgot_password" && "Reset Password"}
          {view === "reset_password" && "Set New Password"}
        </h2>
        <p className="mt-2 text-center text-sm text-[#6B6258]">
          {view === "login" && "Login to track your orders and checkout faster."}
          {view === "register" && "Join Saraswati Sweets for a premium experience."}
          {view === "forgot_password" && "Enter your email to receive a reset link."}
          {view === "reset_password" && "Enter your new password below."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-[#E8E0D8]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {successMsg}
            </div>
          )}

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView("forgot_password")}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[#8B1730] disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="text-center mt-4">
                <p className="text-sm text-stone-600">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setView("register")} className="text-[var(--color-primary)] font-medium hover:underline">
                    Register
                  </button>
                </p>
              </div>
            </form>
          )}

          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[#8B1730] disabled:opacity-50 transition-colors"
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
              <div className="text-center mt-4">
                <p className="text-sm text-stone-600">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setView("login")} className="text-[var(--color-primary)] font-medium hover:underline">
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {view === "forgot_password" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[#8B1730] disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setView("login")} className="text-sm text-[var(--color-primary)] font-medium hover:underline">
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {view === "reset_password" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[#8B1730] disabled:opacity-50 transition-colors"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-stone-200">
            <Link
              href="/admin/login"
              className="text-sm font-medium text-[#6B6258] hover:text-[var(--color-primary)] flex items-center justify-center transition-colors"
            >
              <span>Staff / Admin Portal</span>
              <span className="ml-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBF7F2] flex flex-col justify-center py-12"></div>}>
      <LoginContent />
    </Suspense>
  );
}
