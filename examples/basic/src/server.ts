import type { PartyKitServer } from "partykit/server";
import { safeParty } from "./safe-party";

declare global {
  const SOME_GLOBAL: string;
}

const ctx = { counter: 0 };

export default {
  onConnect(ws, room) {
    console.log(room.env);

    console.log(process.env["WHATUP"]);

    console.log(SOME_GLOBAL);
    // your business logic here
    ws.addEventListener("message", (evt) => {
      safeParty.onMessage(evt.data, ws, room, ctx);
    });
  },

  // onMessage(msg, conn, room) {
  //   if (msg === "ping") {
  //     conn.send(`pong:${room.connections.size}`);
  //   } else if ((msg as string).startsWith("latency")) {
  //     conn.send(msg);
  //   }
  // },

  // async onBeforeConnect(_req: Request) {
  //   return { x: 1 };
  // },

  async onBeforeRequest(req: Request) {
    return new Request(req.url, {
      headers: {
        "x-foo": "bar",
      },
    });
  },
  async onRequest(req: Request, room) {
    console.log(room.env);

    console.log(process.env["WHATUP"]);
    console.log(room.parties);
    // const res = await room.parties.xyz.get("some-id").fetch();
    // console.log("gottt", await res.text());
    const xyz = room.parties["xyz"]!;
    const wssss = xyz.get("some-id").connect();
    wssss.addEventListener("message", (evt) => {
      console.log("got a message from xyz", evt.data);
    });

    console.log(SOME_GLOBAL);
    return new Response("Hello world:" + req.headers.get("x-foo") + " " + room.id);
  },
} satisfies PartyKitServer;
