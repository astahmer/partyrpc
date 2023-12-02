import * as v from "valibot";
import { createPartyRpc } from "partyrpc/server";

type UContext = { counter: number };
type PongResponse = { type: "pong"; size: number };
type LatencyResponse = { type: "latency"; id: string };
type CounterResponse = { type: "counter"; counter: number };

type PartyResponses = PongResponse | LatencyResponse | CounterResponse;

const party = createPartyRpc<PartyResponses, UContext>();

export const safeParty = party.events({
  ping: {
    schema: v.never(),
    onMessage(message, ws, room, ctx) {
      const size = [room.getConnections()].length;
      party.send(ws, { type: "pong", size });
    },
  },
  latency: {
    schema: v.object({ id: v.string() }),
    onMessage(message, ws, room, ctx) {
      party.send(ws, { type: "latency", id: message.id });
    },
  },
  "add-to-counter": {
    schema: v.object({ amount: v.number() }),
    onMessage(message, ws, room, ctx) {
      ctx.counter += message.amount;
      party.broadcast(room, { type: "counter", counter: ctx.counter });
    },
  },
});

export type SafePartyEvents = typeof safeParty.events;
export type SafePartyResponses = typeof safeParty.responses;
