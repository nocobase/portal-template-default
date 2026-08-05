import type {
  PortalDataAggregateInput,
  PortalDataCapabilities,
  PortalDataCreateInput,
  PortalDataDeleteResult,
  PortalDataDestroyInput,
  PortalDataGetInput,
  PortalDataMetadataInput,
  PortalDataQueryInput,
  PortalDataQueryResult,
  PortalDataUpdateInput,
} from "../../shared/portal-data.js";
import type { NocoBaseUpstreamClient } from "./nocobase-upstream-client.js";

export class PortalDataCapabilityClient {
  constructor(private readonly upstream: NocoBaseUpstreamClient) {}

  capabilities() {
    return this.action<PortalDataCapabilities>("capabilities");
  }

  metadata<T = unknown>(input: PortalDataMetadataInput) {
    return this.action<T>("metadata", input);
  }

  query<Row = unknown>(input: PortalDataQueryInput) {
    return this.action<PortalDataQueryResult<Row>>("query", input);
  }

  get<Row = unknown>(input: PortalDataGetInput) {
    return this.action<Row>("get", input);
  }

  create<Row = unknown>(input: PortalDataCreateInput) {
    return this.action<Row>("create", input);
  }

  update<Row = unknown>(input: PortalDataUpdateInput) {
    return this.guardedMutation<Row>("update", input);
  }

  destroy(input: PortalDataDestroyInput) {
    return this.guardedMutation<PortalDataDeleteResult>("destroy", input);
  }

  aggregate<Result = unknown>(input: PortalDataAggregateInput) {
    return this.action<Result>("aggregate", input);
  }

  private action<T>(action: string, body?: unknown) {
    return this.upstream.request<T>(`portalDataCapability:${action}`, {
      body,
      method: "POST",
    });
  }

  private guardedMutation<T>(
    action: "update" | "destroy",
    body: PortalDataUpdateInput | PortalDataDestroyInput
  ) {
    return this.upstream.request<T>(`portalDataCapability:${action}`, {
      body,
      method: "POST",
      query: this.getGuardedMutationQuery(body),
    });
  }

  private getGuardedMutationQuery(input: PortalDataUpdateInput | PortalDataDestroyInput) {
    if (input.filterByTk === undefined || input.filterByTk === null) return undefined;

    return {
      filterByTk: String(input.filterByTk),
    };
  }
}
