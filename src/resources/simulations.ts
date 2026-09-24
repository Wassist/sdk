import type { HttpClient } from '../http';
import type { RequestOptions, UUID } from '../types/common';
import type { Simulation, SimulationMessage } from '../types/sessions';

/** Dashboard test chats with an agent. */
export class SimulationsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieve a simulation with its messages.
   *
   * `GET /simulations/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<Simulation> {
    return this.http.get<Simulation>(`/simulations/${encodeURIComponent(id)}/`, { options });
  }

  /**
   * Every message in a simulation, oldest first.
   *
   * `GET /simulations/{id}/messages/`
   */
  messages(id: UUID, options?: RequestOptions): Promise<SimulationMessage[]> {
    return this.http.get<SimulationMessage[]>(`/simulations/${encodeURIComponent(id)}/messages/`, {
      options,
    });
  }
}
