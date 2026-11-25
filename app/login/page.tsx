"use client";

import { Suspense, useTransition, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction } from "@/app/actions/auth";
import { InstallAppButton } from "@/components/PwaManager";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/scan";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    formData.append("redirectTo", redirectTo);

    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col justify-center min-h-[82dvh] py-6 sm:py-12 px-2 sm:px-4 max-w-sm sm:max-w-md mx-auto">
      {/* Official Mimar Brand Logo */}
      <div className="flex justify-center mb-8 sm:mb-10">
        <Image
          src="/brand/logo.png"
          alt="Mimar Models Logo"
          width={240}
          height={95}
          priority
          className="h-14 sm:h-16 w-auto object-contain"
        />
      </div>

      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border">
        <div className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-xl font-semibold text-text tracking-tight">
            Sign in
          </h1>
          <InstallAppButton />
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-status-issueBg border border-status-issue/30 text-status-issue rounded-xl text-sm leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login"
              className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2"
            >
              User ID
            </label>
            <input
              id="login"
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Enter your Odoo login"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition text-base"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-xl text-text placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-text p-1 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 py-3.5 px-4 bg-primary hover:bg-primary-dark active:scale-[0.99] text-surface font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 text-base"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50dvh]">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
