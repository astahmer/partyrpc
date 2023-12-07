import * as Party from "partykit/server";
import { safeParty } from "./safe-party";

const userCtx = { counter: 0 };

export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    conn.addEventListener("message", (evt) => {
      safeParty.onMessage(evt.data, conn, this.party, userCtx);
    });
  }
}

Server satisfies Party.Worker;
