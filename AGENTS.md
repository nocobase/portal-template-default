# Application Development Guidelines

This repository is a starter for building a NocoBase-powered application. Keep changes focused on the application being built and follow these guidelines before introducing new abstractions.

## Reuse existing extensions

Before writing new code, inspect `registry` in the Registry source repository or `src/extensions` in a published template for similar pages, hooks, components, and integration patterns. Reuse an existing implementation directly when it already fits the requirement, and extend or compose it when only a small adaptation is needed.

## Customize UI components through composition

Treat `src/components/ui` as the project's shadcn/ui foundation. When application-specific behavior or styling is needed, prefer wrapping, pre-composing, or re-exporting the base component from a feature-level component instead of editing the base component directly. This keeps the base components replaceable and makes future updates easier to review.

Components copied from shadcn/ui are owned and maintained by this project; upstream changes are not applied automatically. If a base component must be changed or updated, compare it with the upstream version first, then selectively merge bug fixes and improvements while preserving intentional local behavior. Do not blindly overwrite customized components.

## Develop Portal Registry items

Canonical NocoBase Registry source lives under `registry/`. In this source repository, normal development and builds load it directly; do not copy it into `src/extensions` for preview. Imports from a Registry item to the host application must use the `@/` alias. Relative imports must stay within that Registry item's own root so the item remains portable after installation. Registry items target this Portal Template's React, shadcn Base UI, and pnpm toolchain. They must never import Ant Design or NocoBase's Ant Design-based client components.

Keep Registry items portable and focused on reusable API adapters, hooks, components, and small demos. Update `registry.config.json` whenever an item's files, dependencies, or installation target changes. Validate Registry changes with the normal application build and the relevant regression scripts.
