import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  CreateWhatsAppTemplateInput,
  PublishWhatsAppTemplateInput,
  UnpublishWhatsAppTemplateInput,
  UpdateWhatsAppTemplateInput,
  WhatsAppTemplate,
  WhatsAppTemplateWithPublishResults,
} from '../types/whatsapp-templates';
import type { PageParams, PaginatedResponse, RequestOptions, UUID } from '../types/common';

/**
 * Methods for managing Wassist-side WhatsApp templates and publishing them
 * to your connected WABAs.
 */
export class WhatsAppTemplatesResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List every template you've created in Wassist.
   *
   * `GET /whatsapp-templates/`
   */
  list(
    params: PageParams = {},
    options?: RequestOptions
  ): AutoPaginatedList<WhatsAppTemplate> {
    return new AutoPaginatedList<WhatsAppTemplate>(
      (p) =>
        this.http.get<PaginatedResponse<WhatsAppTemplate>>('/whatsapp-templates/', {
          query: p,
          options,
        }),
      params,
      options
    );
  }

  /**
   * Retrieve a single template by ID.
   *
   * `GET /whatsapp-templates/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<WhatsAppTemplate> {
    return this.http.get<WhatsAppTemplate>(
      `/whatsapp-templates/${encodeURIComponent(id)}/`,
      { options }
    );
  }

  /**
   * Create a new template. Published per-WABA separately via {@link publish}.
   *
   * `POST /whatsapp-templates/`
   */
  create(
    input: CreateWhatsAppTemplateInput,
    options?: RequestOptions
  ): Promise<WhatsAppTemplate> {
    return this.http.post<WhatsAppTemplate>('/whatsapp-templates/', input, options);
  }

  /**
   * Update an existing template's metadata and components.
   *
   * `PATCH /whatsapp-templates/{id}/`
   */
  update(
    id: UUID,
    input: UpdateWhatsAppTemplateInput,
    options?: RequestOptions
  ): Promise<WhatsAppTemplate> {
    return this.http.patch<WhatsAppTemplate>(
      `/whatsapp-templates/${encodeURIComponent(id)}/`,
      input,
      options
    );
  }

  /**
   * Delete a template (and unpublish from every WABA it was published to).
   *
   * `DELETE /whatsapp-templates/{id}/`
   */
  delete(id: UUID, options?: RequestOptions): Promise<void> {
    return this.http.delete<void>(
      `/whatsapp-templates/${encodeURIComponent(id)}/`,
      options
    );
  }

  /**
   * Submit this template to one or more WABAs for approval.
   *
   * Returns the updated template, plus per-account `publishResults` /
   * `publishErrors`.
   *
   * `POST /whatsapp-templates/{id}/publish/`
   */
  publish(
    id: UUID,
    input: PublishWhatsAppTemplateInput,
    options?: RequestOptions
  ): Promise<WhatsAppTemplateWithPublishResults> {
    return this.http.post<WhatsAppTemplateWithPublishResults>(
      `/whatsapp-templates/${encodeURIComponent(id)}/publish/`,
      input,
      options
    );
  }

  /**
   * Remove this template from one or more WABAs.
   *
   * `POST /whatsapp-templates/{id}/unpublish/`
   */
  unpublish(
    id: UUID,
    input: UnpublishWhatsAppTemplateInput,
    options?: RequestOptions
  ): Promise<WhatsAppTemplateWithPublishResults> {
    return this.http.post<WhatsAppTemplateWithPublishResults>(
      `/whatsapp-templates/${encodeURIComponent(id)}/unpublish/`,
      input,
      options
    );
  }
}
