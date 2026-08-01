"use client";

import { useState } from "react";
import { Input, Button, Card } from "@/shared/components";

export default function ToolsPage() {
  const [patInput, setPatInput] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injectionResult, setInjectionResult] = useState(null);

  const handleInjectQoder = async () => {
    if (!patInput.trim()) {
      alert("Please enter your Personal Access Token (PAT)");
      return;
    }

    setInjecting(true);
    try {
      const response = await fetch("/api/tools/qoder-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat: patInput }),
      });

      const data = await response.json();

      if (data.success) {
        setInjectionResult({
          success: true,
          message: data.message || "Qoder injected successfully!",
          output: data.output,
        });
      } else {
        setInjectionResult({
          success: false,
          message: data.error || "Injection failed",
          output: data.output,
        });
      }
    } catch (error) {
      setInjectionResult({
        success: false,
        message: "Error occurred during injection",
        error: error.message,
      });
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Qoder Injector Section */}
      <Card
        title="Qoder Injector"
        subtitle="Inject Qoder access using Personal Access Token (PAT)"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Personal Access Token (PAT)
            </label>
            <Input
              type="password"
              placeholder="Enter your PAT token..."
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              disabled={injecting}
              className="max-w-md"
            />
            <p className="mt-2 text-xs text-text-muted">
              This will run the command: <code className="bg-surface-2 px-1.5 py-0.5 rounded">node src/cli.js auto --pat {`{your_pat}`}</code>
            </p>
          </div>

          <Button
            onClick={handleInjectQoder}
            disabled={injecting || !patInput.trim()}
            variant="primary"
          >
            {injecting ? "Injecting..." : "Inject Qoder"}
          </Button>

          {injectionResult && (
            <div className={`mt-4 rounded-lg border p-4 ${
              injectionResult.success
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {injectionResult.success ? "check_circle" : "error"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-main">
                    {injectionResult.success ? "Success" : "Failed"}
                  </p>
                  <p className="text-sm text-text-main mt-1">
                    {injectionResult.message}
                  </p>
                  {injectionResult.output && (
                    <pre className="mt-2 text-xs font-mono bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {injectionResult.output}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
