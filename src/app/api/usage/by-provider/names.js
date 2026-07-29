import { getProviderNodes } from "@/lib/localDb";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

// Same resolution order as /api/usage/providers: custom node name → registry
// display name → the raw id.
export async function resolveProviderNames(providerIds) {
  const nodeMap = {};
  for (const node of await getProviderNodes()) nodeMap[node.id] = node.name;

  const out = {};
  for (const id of providerIds) {
    const config = getProviderByAlias(id) || AI_PROVIDERS[id];
    out[id] = nodeMap[id] || config?.name || id;
  }
  return out;
}
