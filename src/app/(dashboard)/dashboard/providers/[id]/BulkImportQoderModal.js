"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Modal } from "@/shared/components";

const PLACEHOLDER = `[
  { "pat": "pt-..." },
  { "pat": "pt-...", "name": "Account 2" },
  { "deviceToken": "dt-...", "userId": "user-001" }
]`;

function normalizeToArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.accounts)) return parsed.accounts;
    return [parsed];
  }
  return null;
}

export default function BulkImportQoderModal({ isOpen, onClose, onSuccess }) {
  const [jsonText, setJsonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState(null);

  const handleClose = () => {
    if (submitting) return;
    setJsonText("");
    setParseError("");
    setResult(null);
    onClose();
  };

  const handleSubmit = async () => {
    setParseError("");
    setResult(null);

    const trimmed = jsonText.trim();
    if (!trimmed) return;

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      setParseError(`Invalid JSON: ${err.message}`);
      return;
    }

    const accounts = normalizeToArray(parsed);
    if (!accounts || accounts.length === 0) {
      setParseError("No accounts found in input");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/oauth/qoder/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data?.error || `Request failed: ${res.status}`);
        return;
      }
      setResult(data);
      if (data.success > 0 && typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      setParseError(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const failedItems = result?.results?.filter((r) => !r.ok) || [];

  return (
    <Modal isOpen={isOpen} title="Bulk Add Qoder Accounts" onClose={handleClose}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-text-muted">
          Paste a JSON array of Qoder accounts. Prefer{" "}
          <code className="bg-sidebar px-1 rounded">pat</code> (Personal Access
          Token) — same as qodercli: exchanged server-side for a session token.
          Or pass{" "}
          <code className="bg-sidebar px-1 rounded">deviceToken</code> +{" "}
          <code className="bg-sidebar px-1 rounded">userId</code> from a browser
          device login.{" "}
          <code className="bg-sidebar px-1 rounded">machineId</code> is optional.
        </p>

        <textarea
          className="w-full rounded border border-accent/30 bg-sidebar p-2 text-sm font-mono resize-y min-h-[200px] focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={PLACEHOLDER}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          disabled={submitting}
        />

        {parseError && (
          <p className="text-xs text-red-500 break-words">{parseError}</p>
        )}

        {result && (
          <div className="flex flex-col gap-2">
            <div
              className={`text-sm font-medium ${
                result.failed > 0 ? "text-yellow-400" : "text-green-400"
              }`}
            >
              ✓ {result.success} added
              {result.failed > 0 ? `, ✗ ${result.failed} failed` : ""}
            </div>
            {failedItems.length > 0 && (
              <ul className="rounded border border-accent/20 bg-sidebar/50 p-2 text-xs font-mono max-h-40 overflow-y-auto">
                {failedItems.map((item) => (
                  <li key={item.index} className="text-red-400">
                    [{item.index + 1}] {item.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            fullWidth
            disabled={submitting || !jsonText.trim()}
          >
            {submitting ? "Importing..." : "Import All"}
          </Button>
          <Button onClick={handleClose} variant="ghost" fullWidth disabled={submitting}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

BulkImportQoderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
