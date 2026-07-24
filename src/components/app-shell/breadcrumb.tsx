"use client";

import { Fragment, useMemo } from "react";
import { Home } from "lucide-react";
import {
  matchResourceFromRoute,
  useBreadcrumb,
  useLink,
  useResourceParams,
  useTranslate,
  useUserFriendlyName,
} from "@refinedev/core";
import {
  BreadcrumbSeparator as ShadcnBreadcrumbSeparator,
  BreadcrumbItem as ShadcnBreadcrumbItem,
  BreadcrumbList as ShadcnBreadcrumbList,
  BreadcrumbPage as ShadcnBreadcrumbPage,
  Breadcrumb as ShadcnBreadcrumb,
} from "@/components/ui/breadcrumb";
import { resolveTranslatableText } from "@/lib/i18n";
import { getResourceLabel } from "@/components/resources/resource-label";

export function Breadcrumb() {
  const Link = useLink();
  const { breadcrumbs } = useBreadcrumb();
  const { resources } = useResourceParams();
  const translate = useTranslate();
  const getUserFriendlyName = useUserFriendlyName();
  const rootRouteResource = matchResourceFromRoute("/", resources);

  const breadCrumbItems = useMemo(() => {
    const list: {
      key: string;
      href: string;
      Component: React.ReactNode;
    }[] = [];

    list.push({
      key: "breadcrumb-item-home",
      href: rootRouteResource.matchedRoute ?? "/",
      Component: (
        <Link to={rootRouteResource.matchedRoute ?? "/"}>
          {rootRouteResource?.resource?.meta?.icon ?? (
            <Home className="h-4 w-4" />
          )}
        </Link>
      ),
    });

    for (const { label, href } of breadcrumbs) {
      const matchingResource = resources.find((resource) => {
        const metaLabel = resource.meta?.label;
        return (
          label === metaLabel ||
          label === resource.name ||
          (href &&
            [resource.list, resource.create, resource.edit, resource.show].some(
              (route) => typeof route === "string" && route === href
            ))
        );
      });
      const displayLabel = matchingResource
        ? getResourceLabel(
            matchingResource,
            "plural",
            translate,
            getUserFriendlyName
          )
        : resolveTranslatableText(label);
      list.push({
        key: `breadcrumb-item-${displayLabel}`,
        href: href ?? "",
        Component: href ? (
          <Link to={href}>{displayLabel}</Link>
        ) : (
          <span>{displayLabel}</span>
        ),
      });
    }

    return list;
  }, [
    breadcrumbs,
    getUserFriendlyName,
    Link,
    resources,
    rootRouteResource,
    translate,
  ]);

  return (
    <ShadcnBreadcrumb>
      <ShadcnBreadcrumbList>
        {breadCrumbItems.map((item, index) => {
          if (index === breadCrumbItems.length - 1) {
            return (
              <ShadcnBreadcrumbPage key={item.key}>
                {item.Component}
              </ShadcnBreadcrumbPage>
            );
          }

          return (
            <Fragment key={item.key}>
              <ShadcnBreadcrumbItem key={item.key}>
                {item.Component}
              </ShadcnBreadcrumbItem>
              <ShadcnBreadcrumbSeparator />
            </Fragment>
          );
        })}
      </ShadcnBreadcrumbList>
    </ShadcnBreadcrumb>
  );
}

Breadcrumb.displayName = "Breadcrumb";
