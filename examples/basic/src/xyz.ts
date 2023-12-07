import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onRequest(_req: Party.Request) {
    return new Response("Hello from xyz");
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log("xyz connected");
    conn.send("ping from xyz");
  }
}

Server satisfies Party.Worker;
