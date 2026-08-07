import { getNocoBasePortalName } from "@nocobase/portal-sdk/runtime";

const getPortalName = () => getNocoBasePortalName() ?? "main";

export const portalApiPath = (path = "/") => {
  const normalizedPath = path.replace(/^\/+/, "");
  const prefix = `/api/_portal/${encodeURIComponent(getPortalName())}`;
  return normalizedPath ? `${prefix}/${normalizedPath}` : prefix;
};
