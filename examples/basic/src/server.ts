import type * as Party from "partykit/server";
import { router, safeParty } from "./safe-party";

declare global {
  const SOME_GLOBAL: string;
}

const userCtx = { counter: 0 };

export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(this.party.env);

    console.log(process.env["WHATUP"]);

    console.log(SOME_GLOBAL);
    // your business logic here
    conn.addEventListener("message", (evt) => {
      safeParty.onMessage(evt.data, conn, this.party, userCtx);
    });
  }

  // // onMessage(msg, conn, room) {
  // //   if (msg === "ping") {
  // //     conn.send(`pong:${room.connections.size}`);
  // //   } else if ((msg as string).startsWith("latency")) {
  // //     conn.send(msg);
  // //   }
  // // },

  // // async onBeforeConnect(_req: Request) {
  // //   return { x: 1 };
  // // },

  // async onBeforeRequest(req: Request) {
  //   return new Request(req.url, {
  //     headers: {
  //       "x-foo": "bar",
  //     },
  //   });
  // },
  // async onRequest(req: Request, room) {
  //   console.log(room.env);

  //   console.log(process.env["WHATUP"]);
  //   console.log(room.parties);
  //   // const res = await room.parties.xyz.get("some-id").fetch();
  //   // console.log("gottt", await res.text());
  //   const xyz = room.parties["xyz"]!;
  //   const wssss = xyz.get("some-id").connect();
  //   wssss.addEventListener("message", (evt) => {
  //     console.log("got a message from xyz", evt.data);
  //   });

  //   console.log(SOME_GLOBAL);
  //   return new Response("Hello world:" + req.headers.get("x-foo") + " " + room.id);
  // },
  async onFetch(req, lobby, ctx) {
    console.log("onFetch", req.url);
    // return new Response("unstable_onFetch:" + req.url);
    return router.onFetch(req, lobby, ctx, userCtx);
  }
}

Server satisfies Party.Worker;
