/**
 * Resolve a provider's markup percentage (what the provider keeps).
 * System commission is always (100 - markup).
 * Prefer nullish coalescing so 0% is a valid configured value.
 */
export function resolveProviderMarkupPercentage(
  ...sources: Array<{ provider_markup_percentage?: number | null } | number | null | undefined>
): number {
  for (const source of sources) {
    if (source == null) continue;
    const value =
      typeof source === 'number' ? source : source.provider_markup_percentage;
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 50;
}

export function resolveSystemCommissionPercentage(
  ...sources: Array<{ provider_markup_percentage?: number | null } | number | null | undefined>
): number {
  return 100 - resolveProviderMarkupPercentage(...sources);
}
