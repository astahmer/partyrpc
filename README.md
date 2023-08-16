# partyrpc

Move Fast (and Break Everything). Everything is better with typesafety.

## Install

Not on npm yet.

## Usage

- Events: what your party server expects to receive from clients
- Responses: what your party server sends to clients

Define your (safe) party events and responses:

```ts
// src/safe-party.ts
import * as v from "valibot";
import { createPartyRpc } from "partyrpc/server";

type Context = { counter: number };
type PongResponse = { type: "pong"; size: number };
type LatencyResponse = { type: "latency"; id: string };
type CounterResponse = { type: "counter"; counter: number };

type PartyResponses = PongResponse | LatencyResponse | CounterResponse;

const party = createPartyRpc<Context, PartyResponses>();

export const safeParty = party.events({
  ping: {
    schema: v.never(),
    onMessage(payload, ws, room, ctx) {
      party.send(ws, { type: "pong", size: room.connections.size });
    },
  },
  latency: {
    schema: v.object({ id: v.string() }),
    onMessage(payload, ws, room, ctx) {
      party.send(ws, { type: "latency", id: payload.id });
    },
  },
  "add-to-counter": {
    schema: v.object({ amount: v.number() }),
    onMessage(payload, ws, room, ctx) {
      ctx.counter += payload.amount;
      party.send(ws, { type: "counter", counter: ctx.counter });
    },
  },
});

export type SafePartyEvents = typeof safeParty.events;
export type SafePartyResponses = typeof safeParty.responses;
```

Bind it to your party server:

```ts
// src/server.ts
import type { PartyKitServer } from "partykit/server";
import { safeParty } from "./safe-party";

// optional context
const ctx = { counter: 0 };

export default {
  onConnect(ws, room) {
    // ...
    ws.addEventListener("message", (evt) => {
      // simply use the safe party message handler
      safeParty.onMessage(evt.data, ws, room, ctx);
    });
  },
};
```

Finally, create your party client:

```ts
// src/client.ts
import PartySocket from "partysocket";
import { createPartyClient } from "partyrpc/client";
import { SafePartyEvents, SafePartyResponses } from "./safe-party";

const partySocket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "some-room",
});
const client = createPartyClient<SafePartyEvents, SafePartyResponses>(partySocket, { debug: true });
```

Subscribe to typesafe responses:

```ts
// src/clients.ts

client.on("latency", (msg) => {
  // msg is typed as LatencyResponse, defined above as { type: "latency"; id: string }
});

client.on("pong", (msg) => {
  console.log("got pong", msg.size);
  // msg is typed as PongResponse, defined above as { type: "pong"; size: number }
});

client.on("counter", (msg) => {
  // msg is typed as CounterResponse, defined above as { type: "counter"; counter: number }
});
```

Send typesafe events:

```ts
// src/clients.ts

client.send({ type: "ping" }); // ✅
client.send({ type: "ping", id: "foo" }); // ❌ error, 'id' does not exist in type '{ type: "ping"; }'.

client.send({ type: "add-to-counter", amount: 3 }); // ✅
client.send({ type: "add-to-counter" }); // ❌ error, 'amount' is declared here.
```

You can also hook to typesafe events (only react atm).

- `usePartyEvent` is a hook that will trigger your callback whenever a message of a given type is received.
- that callback will always have the latest state of your component, thanks to a
  [`useEvent`](https://github.com/scottrippey/react-use-event-hook) hook.
- `usePartyEvent` doesn't add any event listener to the socket, it really just hooks into the client's message handler

```ts
// src/clients.ts
import { createPartyHooks } from "partyrpc/react";
const { usePartyEvent } = createPartyHooks(client);

function App() {
  const [count, setCount] = useState(0);

  usePartyEvent("counter", (msg) => {
    console.log("received counter", msg);
    // msg is typed as CounterResponse, defined above as { type: "counter"; counter: number }

    console.log({ count });
    // count is always up to date, thanks to a useEvent hook
  });

  // ...
}
```

# Caveats

- Currently only compatible with `valibot`, ideally it'll use [`typeschema`](https://github.com/decs/typeschema) at some
  point to allow you to use your preferred validation library.
- Currently only allow events and responses that match a `{ type: string }` shape, ala
  [xstate](https://github.com/statelyai/xstate). Not sure if that will change. Maybe data will end up being wrapped in a
  `data` property, but that seems like a lot of extra typing.
