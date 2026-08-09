import { Boxes, LoaderCircle } from "lucide-react";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { useMultiSpaceTranslation } from "./i18n";
import { resolveSpaceLabel } from "./space-label";
import { useMultiSpace } from "./space-provider";

export function SpaceSwitcher({ className }: { className?: string }) {
  const t = useMultiSpaceTranslation();
  const { spaces, current, loading, switchSpace } = useMultiSpace();
  const value = current[0] ?? "";
  const unassignedLabel = t("space.unassigned", "(Unassigned Space)");

  return (
    <div className={className}>
      <label
        htmlFor="multi-space-page-switcher"
        className="mb-2 block text-xs font-medium text-muted-foreground"
      >
        {t("switcher.current", "Current workspace")}
      </label>
      <div className="relative">
        <Boxes className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <NativeSelect
          id="multi-space-page-switcher"
          aria-label={t("switcher.label", "Switch workspace")}
          className="min-w-56 pl-9"
          value={value}
          disabled={loading || spaces.length === 0}
          onChange={(event) => {
            const next = event.target.value;
            if (next && next !== value) void switchSpace(next);
          }}
        >
          {!value ? (
            <NativeSelectOption value="">
              {loading
                ? t("switcher.loading", "Loading workspaces...")
                : t("switcher.empty", "No workspace available")}
            </NativeSelectOption>
          ) : null}
          {spaces.map((space) => (
            <NativeSelectOption key={space.name} value={space.name}>
              {resolveSpaceLabel(space, unassignedLabel)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {loading ? (
          <LoaderCircle className="pointer-events-none absolute top-1/2 right-8 size-4 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>
    </div>
  );
}

export function SpaceUserMenuItems() {
  const t = useMultiSpaceTranslation();
  const { spaces, current, switchSpace } = useMultiSpace();
  const unassignedLabel = t("space.unassigned", "(Unassigned Space)");
  if (!spaces.length) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="min-h-9 gap-2 px-2 text-muted-foreground">
          <Boxes />
          <span>{t("switcher.workspace", "Workspace")}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-48">
          <DropdownMenuRadioGroup
            value={current[0]}
            onValueChange={(value) =>
              value && value !== current[0] && void switchSpace(value)
            }
          >
            {spaces.map((space) => (
              <DropdownMenuRadioItem key={space.name} value={space.name}>
                {resolveSpaceLabel(space, unassignedLabel)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
