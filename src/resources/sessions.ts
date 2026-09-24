import type { HttpClient } from '../http';
import type { RequestOptions, UUID } from '../types/common';
import type { Session } from '../types/sessions';

/** Agent sessions, and the channel each one is talking on. */
export class SessionsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieve a session with its channel: a WhatsApp conversation or a
   * dashboard simulation.
   *
   * `GET /sessions/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<Session> {
    return this.http.get<Session>(`/sessions/${encodeURIComponent(id)}/`, { options });
  }
}
