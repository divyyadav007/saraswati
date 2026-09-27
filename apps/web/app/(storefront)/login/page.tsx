"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useCart } from "@/lib/cart-context";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/profile";
  const { mergeGuestCart } = useCart();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  // Redirect if already logged in
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token && token !== "mock-customer-token") {
      router.replace(returnTo);
    }
  }, [router, returnTo]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
      });

      if (signInError) {
        throw signInError;
      } else {
        setStep("otp");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;

      if (data?.session) {
        // Successful verification!
        const token = data.session.access_token;
        localStorage.setItem("auth_token", token);

        // Sync profile with the backend
        try {
          // Note: sync-profile API is available in authApi. If not, we will need to add it to api-client.
          // Let's assume authApi.syncProfile exists or we fetch directly.
          await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/auth/sync-profile" || "http://localhost:8000/api/v1/auth/sync-profile", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                  full_name: fullName.trim() || undefined
              })
          });
        } catch (e) {
          console.error("Failed to sync profile:", e);
        }

        // Merge cart
        await mergeGuestCart(token);

        router.push(returnTo);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <div className="w-16 h-16 rounded-full bg-[#8A1538] flex items-center justify-center shadow-lg">
              <span className="text-3xl">🪔</span>
            </div>
          </Link>
        </div>
        <h2 className="text-center text-3xl font-serif font-bold text-[#1F1B16]">
          Welcome to Saraswati Sweets
        </h2>
        <p className="mt-2 text-center text-sm text-[#6B6258]">
          Login or create an account to track your orders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-[#E8E0D8]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-stone-700">
                  Full Name (Optional for existing customers)
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-[#8A1538] focus:border-[#8A1538] sm:text-sm"
                    placeholder="E.g. Rahul Sharma"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-[#8A1538] focus:border-[#8A1538] sm:text-sm"
                    placeholder="rahul@example.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !email.includes("@")}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8A1538] hover:bg-maroon-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8A1538] disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Continue with Email"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-stone-700">
                  Enter 6-digit OTP
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-[#8A1538] focus:border-[#8A1538] sm:text-sm text-center tracking-widest text-lg"
                    placeholder="------"
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Sent to {email}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    className="ml-2 text-[#C9A227] hover:text-amber-600"
                  >
                    Change Email
                  </button>
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8A1538] hover:bg-maroon-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8A1538] disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-stone-200">
            <Link
              href="/admin/login"
              className="text-sm font-medium text-[#6B6258] hover:text-[#8A1538] flex items-center justify-center transition-colors"
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
    <Suspense fallback={<div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
