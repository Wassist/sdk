import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  AddNumberInput,
  AvailableNumbersResponse,
  WhatsAppAccount,
} from '../types/whatsapp-accounts';
import type { PageParams, PaginatedResponse, RequestOptions, UUID } from '../types/common';

/**
 * Methods for managing WhatsApp Business Accounts (WABAs) connected to
 * your Wassist account.
 */
export class WhatsAppAccountsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List every WhatsApp Business Account on your Wassist account.
   *
   * `GET /whatsapp-accounts/`
   */
  list(
    params: PageParams = {},
    options?: RequestOptions
  ): AutoPaginatedList<WhatsAppAccount> {
    return new AutoPaginatedList<WhatsAppAccount>(
      (p) =>
        this.http.get<PaginatedResponse<WhatsAppAccount>>('/whatsapp-accounts/', {
          query: p,
          options,
        }),
      params,
      options
    );
  }

  /**
   * Retrieve a single WhatsApp Business Account by ID.
   *
   * `GET /whatsapp-accounts/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<WhatsAppAccount> {
    return this.http.get<WhatsAppAccount>(
      `/whatsapp-accounts/${encodeURIComponent(id)}/`,
      { options }
    );
  }

  /**
   * Add a pre-verified phone number (purchased via Meta's embedded
   * signup flow) to a WhatsApp Business Account.
   *
   * `POST /whatsapp-accounts/{id}/add-number/`
   */
  addNumber(
    id: UUID,
    input: AddNumberInput,
    options?: RequestOptions
  ): Promise<WhatsAppAccount> {
    return this.http.post<WhatsAppAccount>(
      `/whatsapp-accounts/${encodeURIComponent(id)}/add-number/`,
      input,
      options
    );
  }

  /**
   * List Twilio phone numbers available for purchase + verification.
   *
   * `GET /available-numbers/`
   */
  availableNumbers(options?: RequestOptions): Promise<AvailableNumbersResponse> {
    return this.http.get<AvailableNumbersResponse>('/available-numbers/', { options });
  }
}
