import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  ConnectAgentInput,
  PhoneNumber,
  PhoneNumberBusinessProfile,
  SubscribePhoneNumberInput,
  UnsubscribePhoneNumberInput,
} from '../types/phone-numbers';
import type { PageParams, PaginatedResponse, RequestOptions } from '../types/common';

/**
 * Methods for managing your connected WhatsApp phone numbers and their
 * default routing.
 *
 * The `number` argument throughout is the E.164-format number without a
 * leading `+` (matches the {@link PhoneNumber.number} field).
 */
export class PhoneNumbersResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List every WhatsApp number on your account.
   *
   * `GET /phone-numbers/`
   */
  list(params: PageParams = {}, options?: RequestOptions): AutoPaginatedList<PhoneNumber> {
    return new AutoPaginatedList<PhoneNumber>(
      (p) =>
        this.http.get<PaginatedResponse<PhoneNumber>>('/phone-numbers/', {
          query: p,
          options,
        }),
      params,
      options
    );
  }

  /**
   * View the WhatsApp Business Profile (about, address, websites, etc.)
   * attached to this number.
   *
   * `GET /phone-numbers/{number}/business-profile/`
   */
  getBusinessProfile(
    number: string,
    options?: RequestOptions
  ): Promise<PhoneNumberBusinessProfile> {
    return this.http.get<PhoneNumberBusinessProfile>(
      `/phone-numbers/${encodeURIComponent(number)}/business-profile/`,
      { options }
    );
  }

  /**
   * Route inbound messages on this number to a webhook by default. Drops
   * any agent previously connected to the number.
   *
   * Phone-number routing changes do **not** fire
   * `subscription.activated` / `.revoked` webhook events — those are
   * reserved for per-conversation
   * {@link ConversationsResource.subscribe} /
   * {@link ConversationsResource.unsubscribe}.
   *
   * `POST /phone-numbers/{number}/subscribe/`
   */
  subscribe(
    number: string,
    input: SubscribePhoneNumberInput,
    options?: RequestOptions
  ): Promise<PhoneNumber> {
    return this.http.post<PhoneNumber>(
      `/phone-numbers/${encodeURIComponent(number)}/subscribe/`,
      input,
      options
    );
  }

  /**
   * Assign an agent as the default for this number. Drops any subscribed
   * webhook.
   *
   * The agent must already be owned by or shared with the authenticated
   * user.
   *
   * `POST /phone-numbers/{number}/connect-agent/`
   */
  connectAgent(
    number: string,
    input: ConnectAgentInput,
    options?: RequestOptions
  ): Promise<PhoneNumber> {
    return this.http.post<PhoneNumber>(
      `/phone-numbers/${encodeURIComponent(number)}/connect-agent/`,
      input,
      options
    );
  }

  /**
   * Clear default routing on this number entirely. Drops both the agent
   * and the webhook.
   *
   * `POST /phone-numbers/{number}/unsubscribe/`
   */
  unsubscribe(
    number: string,
    input: UnsubscribePhoneNumberInput = {},
    options?: RequestOptions
  ): Promise<PhoneNumber> {
    return this.http.post<PhoneNumber>(
      `/phone-numbers/${encodeURIComponent(number)}/unsubscribe/`,
      input,
      options
    );
  }
}
