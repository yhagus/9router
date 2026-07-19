"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input, Pagination, Toggle, SegmentedControl } from "@/shared/components";

const EMPTY_USAGE = { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
const MENU_WIDTH = 180;
const MENU_GAP = 4;

function formatCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  return String(num);
}

function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "•".repeat(Math.min(8, fullKey.length - 10)) + fullKey.slice(-4);
}

function KeyActionsMenu({ keyItem, onEditComboAccess, onEditModelAccess, onSetDefault, onDeleteKey }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const showSetDefault =
    typeof onSetDefault === "function" &&
    keyItem?.visibility === "public" &&
    keyItem?.isDefault !== true;

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(MENU_GAP, rect.top - menuHeight - MENU_GAP)
      : Math.min(window.innerHeight - menuHeight - MENU_GAP, rect.bottom + MENU_GAP);
    const left = Math.min(
      window.innerWidth - MENU_WIDTH - MENU_GAP,
      Math.max(MENU_GAP, rect.right - MENU_WIDTH)
    );
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const run = (fn) => {
    setOpen(false);
    fn();
  };

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="fixed z-[100] rounded-lg border border-border bg-bg py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onEditComboAccess(keyItem))}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-black/5 dark:hover:bg-white/5 text-left"
          >
            <span className="material-symbols-outlined text-[16px] text-text-muted">rule</span>
            Combo access
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onEditModelAccess(keyItem))}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-black/5 dark:hover:bg-white/5 text-left"
          >
            <span className="material-symbols-outlined text-[16px] text-text-muted">model_training</span>
            Model access
          </button>
          {showSetDefault && (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(() => onSetDefault(keyItem.id))}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-black/5 dark:hover:bg-white/5 text-left"
            >
              <span className="material-symbols-outlined text-[16px] text-text-muted">star</span>
              Set as default
            </button>
          )}
          <div className="my-1 border-t border-black/5 dark:border-white/5" />
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => onDeleteKey(keyItem.id))}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 text-left"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete key
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary"
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>
      {menu}
    </>
  );
}

export default function ApiKeysList({
  keys,
  pagination,
  searchInput,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  visibilityTab = "private",
  onVisibilityTabChange,
  visibleKeys,
  onToggleVisibility,
  copied,
  onCopy,
  onCreate,
  onToggleKey,
  onEditComboAccess,
  onEditModelAccess,
  onSetDefault,
  onDeleteKey,
  onConfirmPause,
}) {
  const hasKeys = keys.length > 0;
  const hasSearch = Boolean(searchInput?.trim());
  const totalItems = pagination?.totalItems ?? 0;
  const tabLabel = visibilityTab === "public" ? "public" : "private";

  return (
    <div className="flex flex-col gap-3">
      {typeof onVisibilityTabChange === "function" && (
        <SegmentedControl
          size="sm"
          value={visibilityTab === "public" ? "public" : "private"}
          onChange={onVisibilityTabChange}
          options={[
            { value: "private", label: "Private" },
            { value: "public", label: "Public" },
          ]}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1 min-w-0">
          <Input
            icon="search"
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            inputClassName="py-2"
          />
        </div>
        <Button icon="add" onClick={onCreate} className="shrink-0">
          Create Key
        </Button>
      </div>

      {!hasKeys ? (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <span className="material-symbols-outlined text-[24px]">vpn_key</span>
          </div>
          <p className="text-text-main font-medium mb-1">
            {hasSearch ? "No matching API keys" : `No ${tabLabel} API keys yet`}
          </p>
          <p className="text-sm text-text-muted mb-3">
            {hasSearch
              ? "Try a different name or clear the search"
              : `Create a ${tabLabel} API key to get started`}
          </p>
          {!hasSearch && (
            <Button icon="add" onClick={onCreate}>
              Create Key
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
                  <th className="py-2 px-2 font-medium w-[20%]">Name</th>
                  <th className="py-2 px-2 font-medium w-[30%]">Key</th>
                  <th className="py-2 px-2 font-medium w-[22%] text-right">Tokens</th>
                  <th className="py-2 px-2 font-medium w-[10%] text-right">Req</th>
                  <th className="py-2 px-2 font-medium w-[18%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const usage = key.usage || EMPTY_USAGE;
                  const isPaused = key.isActive === false;
                  const comboMode = (key.comboAccessMode || "blacklist") === "whitelist" ? "WL" : "BL";
                  const modelMode = (key.modelAccessMode || "whitelist") === "blacklist" ? "BL" : "WL";
                  const comboCount = Array.isArray(key.comboAccessList) ? key.comboAccessList.length : 0;
                  const modelCount = Array.isArray(key.modelAccessList) ? key.modelAccessList.length : 0;
                  const totalTitle = `${(usage.totalTokens || 0).toLocaleString()} total · ${(usage.promptTokens || 0).toLocaleString()} in · ${(usage.completionTokens || 0).toLocaleString()} out`;

                  return (
                    <tr
                      key={key.id}
                      className={`group border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${isPaused ? "opacity-60" : ""}`}
                    >
                      <td className="py-2 px-2 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium truncate" title={key.name}>
                            {key.name}
                          </span>
                          {key.visibility === "public" ? (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                              Public
                            </span>
                          ) : (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-muted shrink-0">
                              Private
                            </span>
                          )}
                          {key.visibility === "public" && key.isDefault && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              Default
                            </span>
                          )}
                          {isPaused && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/10 text-orange-500 shrink-0">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                          {" · "}
                          C:{comboMode}{comboCount ? `(${comboCount})` : ""}
                          {" / "}
                          M:{modelMode}{modelCount ? `(${modelCount})` : ""}
                        </p>
                      </td>
                      <td className="py-2 px-2 align-middle">
                        <div className="flex items-center gap-1 min-w-0">
                          <code className="text-xs text-text-muted font-mono truncate">
                            {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                          </code>
                          <button
                            type="button"
                            onClick={() => onToggleVisibility(key.id)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary shrink-0"
                            title={visibleKeys.has(key.id) ? "Hide key" : "Show key"}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {visibleKeys.has(key.id) ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopy(key.key, key.id)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary shrink-0"
                            title="Copy key"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copied === key.id ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 align-middle text-right" title={totalTitle}>
                        <div className="text-sm font-mono font-medium text-text-main">
                          {formatCompact(usage.totalTokens)}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted">
                          {formatCompact(usage.promptTokens)} in · {formatCompact(usage.completionTokens)} out
                        </div>
                      </td>
                      <td className="py-2 px-2 align-middle text-right">
                        <span className="text-sm font-mono" title={`${(usage.requests || 0).toLocaleString()} requests`}>
                          {formatCompact(usage.requests)}
                        </span>
                      </td>
                      <td className="py-2 px-2 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Toggle
                            size="sm"
                            checked={key.isActive ?? true}
                            onChange={(checked) => {
                              if (key.isActive && !checked) {
                                onConfirmPause(key, checked);
                              } else {
                                onToggleKey(key.id, checked);
                              }
                            }}
                            title={key.isActive ? "Pause key" : "Resume key"}
                          />
                          <KeyActionsMenu
                            keyItem={key}
                            onEditComboAccess={onEditComboAccess}
                            onEditModelAccess={onEditModelAccess}
                            onSetDefault={onSetDefault}
                            onDeleteKey={onDeleteKey}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={totalItems}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              className="py-2 px-0"
            />
          )}
        </>
      )}
    </div>
  );
}
