"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/shared/components";
import { APP_NAME } from "@/shared/constants/config";

export default function GuestLoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (res.ok) {
        window.location.assign("/client");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid API key");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{APP_NAME} Client</h1>
          <p className="text-text-muted">Enter your API key to view your usage</p>
        </div>

        <Card>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Paste your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!apiKey.trim()}>
              Login as Guest
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
