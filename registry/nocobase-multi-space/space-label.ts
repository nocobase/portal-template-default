import { resolveTranslatableText } from "@nocobase/portal-sdk/i18n";

import type { SpaceRecord } from "./types";

const UNASSIGNED_SPACE_KEY = "(Unassigned Space)";

function isUnassignedSpaceTitle(value: string) {
  return (
    value === UNASSIGNED_SPACE_KEY ||
    value.includes(`t("${UNASSIGNED_SPACE_KEY}"`) ||
    value.includes(`t('${UNASSIGNED_SPACE_KEY}'`)
  );
}

export function resolveSpaceLabel(
  space: SpaceRecord | undefined,
  unassignedLabel = UNASSIGNED_SPACE_KEY
) {
  if (!space) return "";
  const source = space.title?.trim() || space.name;
  if (isUnassignedSpaceTitle(source)) return unassignedLabel;
  return resolveTranslatableText(source) || space.name;
}
