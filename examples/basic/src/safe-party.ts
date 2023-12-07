import * as v from "valibot";
import { createPartyRpc } from "partyrpc/server";

type UContext = { counter: number };
type PongResponse = { type: "pong"; size: number };
type LatencyResponse = { type: "latency"; id: string };
type CounterResponse = { type: "counter"; counter: number };

type PartyResponses = PongResponse | LatencyResponse | CounterResponse;

const party = createPartyRpc<PartyResponses, UContext>();
export const router = party.endpoints([
  party.route({
    method: "get",
    path: "/api/counter",
    response: v.object({ counter: v.number() }),
    handler(_req, _lobby, _ctx, userCtx) {
      return { counter: userCtx.counter };
    },
  }),
  party.route({
    method: "post",
    path: "/api/counter",
    parameters: {
      body: v.object({ amount: v.number() }),
    },
    response: v.object({ counter: v.number(), added: v.number() }),
    handler(req, lobby, ctx, userCtx) {
      req.params;
      //   ^?

      userCtx.counter += req.params.body.amount;
      // ^?

      return { counter: userCtx.counter, added: req.params.body.amount };
    },
  }),
]);

export const safeParty = party.events({
  ping: {
    schema: v.never(),
    onMessage(message, ws, room, ctx) {
      const connections = room.getConnections();
      party.send(ws, { type: "pong", size: [...connections].length });
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
      party.send(ws, { type: "counter", counter: ctx.counter });
    },
  },
});

export type SafePartyEvents = typeof safeParty.events;
export type SafePartyResponses = typeof safeParty.responses;
