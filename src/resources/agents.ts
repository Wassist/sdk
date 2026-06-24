import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  Agent,
  CreateAgentInput,
  CreateBYOAAgentInput,
  UpdateAgentInput,
} from '../types/agents';
import type { PageParams, PaginatedResponse, RequestOptions, UUID } from '../types/common';

/**
 * Methods for managing agents — the AI personas you connect to WhatsApp.
 *
 * Documented at https://docs.wassist.app/api-reference/agents/list.
 */
export class AgentsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List every agent on your account.
   *
   * Returns a lazily-fetched paginated list. Use `for await` to walk all
   * pages, or `.firstPage()` for just the first.
   *
   * `GET /agents/`
   *
   * @example
   * ```ts
   * for await (const agent of wassist.agents.list()) {
   *   console.log(agent.id, agent.name);
   * }
   * ```
   */
  list(params: PageParams = {}, options?: RequestOptions): AutoPaginatedList<Agent> {
    return new AutoPaginatedList<Agent>(
      (p) => this.http.get<PaginatedResponse<Agent>>('/agents/', { query: p, options }),
      params,
      options
    );
  }

  /**
   * Retrieve a single agent by ID.
   *
   * `GET /agents/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<Agent> {
    return this.http.get<Agent>(`/agents/${encodeURIComponent(id)}/`, { options });
  }

  /**
   * Create a new agent with the given display name. Configure it further
   * with {@link AgentsResource.update}.
   *
   * `POST /agents/`
   */
  create(input: CreateAgentInput, options?: RequestOptions): Promise<Agent> {
    return this.http.post<Agent>('/agents/', input, options);
  }

  /**
   * Create a Bring-Your-Own-Agent (BYOA) — Wassist forwards inbound
   * messages to your webhook and posts back replies you author yourself.
   *
   * `POST /agents/byoa/`
   */
  createBYOA(input: CreateBYOAAgentInput, options?: RequestOptions): Promise<Agent> {
    return this.http.post<Agent>('/agents/byoa/', input, options);
  }

  /**
   * Partially update an agent. Only the fields you pass are modified.
   *
   * Nested sub-resource arrays (tools, memory keys, etc.) are diffed
   * server-side by `id`: include an `id` to update an existing entry,
   * omit it to create one.
   *
   * `PATCH /agents/{id}/`
   */
  update(id: UUID, input: UpdateAgentInput, options?: RequestOptions): Promise<Agent> {
    return this.http.patch<Agent>(`/agents/${encodeURIComponent(id)}/`, input, options);
  }

  /**
   * Soft-delete an agent. The agent stops responding immediately;
   * conversation history is retained.
   *
   * `DELETE /agents/{id}/`
   */
  delete(id: UUID, options?: RequestOptions): Promise<void> {
    return this.http.delete<void>(`/agents/${encodeURIComponent(id)}/`, options);
  }
}
