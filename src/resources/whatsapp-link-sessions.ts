import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  CreateWhatsAppLinkSessionInput,
  WhatsAppLinkSession,
} from '../types/whatsapp-link-sessions';
import type { PageParams, PaginatedResponse, RequestOptions, UUID } from '../types/common';

/**
 * Methods for managing WhatsApp account-linking sessions — the hosted
 * flow that lets your customers connect their own WABA to your platform.
 */
export class WhatsAppLinkSessionsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List every link session you've created.
   *
   * `GET /whatsapp-link-sessions/`
   */
  list(
    params: PageParams = {},
    options?: RequestOptions
  ): AutoPaginatedList<WhatsAppLinkSession> {
    return new AutoPaginatedList<WhatsAppLinkSession>(
      (p) =>
        this.http.get<PaginatedResponse<WhatsAppLinkSession>>(
          '/whatsapp-link-sessions/',
          { query: p, options }
        ),
      params,
      options
    );
  }

  /**
   * Retrieve a single link session by ID.
   *
   * `GET /whatsapp-link-sessions/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<WhatsAppLinkSession> {
    return this.http.get<WhatsAppLinkSession>(
      `/whatsapp-link-sessions/${encodeURIComponent(id)}/`,
      { options }
    );
  }

  /**
   * Create a new link session. Direct the user to the returned `linkUrl`.
   *
   * `POST /whatsapp-link-sessions/`
   */
  create(
    input: CreateWhatsAppLinkSessionInput,
    options?: RequestOptions
  ): Promise<WhatsAppLinkSession> {
    return this.http.post<WhatsAppLinkSession>(
      '/whatsapp-link-sessions/',
      input,
      options
    );
  }

  /**
   * Expire a pending link session early. Useful for invalidating stale
   * URLs you've handed out to customers.
   *
   * `POST /whatsapp-link-sessions/{id}/expire/`
   */
  expire(id: UUID, options?: RequestOptions): Promise<WhatsAppLinkSession> {
    return this.http.post<WhatsAppLinkSession>(
      `/whatsapp-link-sessions/${encodeURIComponent(id)}/expire/`,
      undefined,
      options
    );
  }
}
