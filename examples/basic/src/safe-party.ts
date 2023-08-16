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