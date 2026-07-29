"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsageStats, RequestLogger, CardSkeleton, SegmentedControl } from "@/shared/components";
import RequestDetailsTab from "./components/RequestDetailsTab";
import ApiKeysTab from "./components/ApiKeysTab";
import ProvidersTab from "./components/ProvidersTab";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "all", label: "All Time" },
];

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "details", label: "Details" },
  { value: "api-keys", label: "API Key" },
  { value: "providers", label: "Providers" },
];

const TAB_VALUES = new Set(TABS.map((t) => t.value));

export default function UsagePage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <UsageContent />
    </Suspense>
  );
}

function UsageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [overviewPeriod, setOverviewPeriod] = useState("today");
  const [apiKeysPeriod, setApiKeysPeriod] = useState("all");
  const [providersPeriod, setProvidersPeriod] = useState("all");

  const tabFromUrl = searchParams.get("tab");
  const activeTab = tabFromUrl && TAB_VALUES.has(tabFromUrl) ? tabFromUrl : "overview";

  // Each tab keeps its own period selection; a map beats nested ternaries here.
  const periodByTab = {
    overview: [overviewPeriod, setOverviewPeriod],
    "api-keys": [apiKeysPeriod, setApiKeysPeriod],
    providers: [providersPeriod, setProvidersPeriod],
  };
  const [period, setPeriod] = periodByTab[activeTab] || periodByTab.overview;
  const showPeriod = activeTab in periodByTab;

  const handleTabChange = (value) => {
    if (value === activeTab) return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`/dashboard/usage?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={TABS}
          value={activeTab}
          onChange={handleTabChange}
          className="w-full sm:w-auto"
        />
        {showPeriod && (
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            size="sm"
            className="w-full sm:w-auto"
          />
        )}
      </div>

      {activeTab === "overview" && (
        <Suspense fallback={<CardSkeleton />}>
          <UsageStats period={overviewPeriod} setPeriod={setOverviewPeriod} hidePeriodSelector />
        </Suspense>
      )}
      {activeTab === "logs" && <RequestLogger />}
      {activeTab === "details" && <RequestDetailsTab />}
      {activeTab === "api-keys" && <ApiKeysTab period={apiKeysPeriod} />}
      {activeTab === "providers" && <ProvidersTab period={providersPeriod} />}
    </div>
  );
}
