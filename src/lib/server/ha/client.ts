/**
 * Server-only HA connection factory.
 * Lives under src/lib/server/ so SvelteKit enforces that it can never be
 * imported from client-side code (it will throw a build-time error if
 * anything outside a *.server.ts file tries to import it).
 */
import {
  createConnection,
  createLongLivedTokenAuth,
  type Connection,
} from 'home-assistant-js-websocket';

export async function connectToHA(haUrl: string, haToken: string): Promise<Connection> {
  const auth = createLongLivedTokenAuth(haUrl, haToken);
  return createConnection({ auth });
}
