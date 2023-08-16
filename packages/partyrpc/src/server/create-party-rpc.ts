import * as v from "valibot";

import { PartyKitConnection, PartyKitRoom } from "partykit/server";

type Pretty<T> = { [K in keyof T]: T[K] } & {};

type Schema = v.AnySchema;
type Infer<TSchema> = TSchema extends v.BaseSchema ? v.Output<TSchema> : never;

class ValidationIssue extends Error {
  constructor(message: string, public path?: Array<string | number | symbol>) {
    super(message);
  }
}

const createAssert = <TSchema extends Schema>(schema: TSchema) => {
  return (data: unknown) => {
    const result = v.safeParse(schema, data);
    if (result.success) {
      return result.data;
    }

    return {
      issues: result.error.issues.map(
        ({ message, path }) =>
          new ValidationIssue(
            message,
            path?.map(({ key }) => key),
          ),
      ),
    };
  };
};

type TypedHandler<TSchema, Context> = (
  payload: TSchema,
  ws: PartyKitConnection,
  room: PartyKitRoom,
  ctx: Context,
) => void | Promise<void>;

type CreateAssert<TSchema extends Schema> = (schema: TSchema) => (data: unknown) => Promise<Infer<TSchema>>;

type EventDefinition<TType, TSchema, Context> = {
  type: TType;
  schema: TSchema;
  onMessage: TSchema extends Schema
    ? TypedHandler<Pretty<Infer<TSchema> & { type: TType }>, Context>
    : TypedHandler<{ type: TType }, Context>;
  assert: ReturnType<CreateAssert<TSchema extends Schema ? TSchema : Schema>>;
};
export type AnyEventMap = {
  [K: string]: {
    schema: unknown;
    onMessage: TypedHandler<any, any>;
  };
};

type EventMap<E, Context> = {
  [K in keyof E]: {
    schema: E[K];
    onMessage: Infer<E[K]> extends never | v.NeverSchema
      ? TypedHandler<{ type: K }, Context>
      : TypedHandler<Pretty<Infer<E[K]> & { type: K }>, Context>;
  };
};

const decoder = new TextDecoder();
const decode = <Payload = any>(payload: ArrayBuffer | string) => {
  try {
    const data = payload instanceof ArrayBuffer ? decoder.decode(payload) : payload;
    return JSON.parse(data) as Payload;
  } catch (err) {
    return;
  }
};

type EmptyMessageResponse = { type: "ws.error"; reason: "empty message" };
type InvalidMessageResponse = { type: "ws.error"; reason: "invalid message" };
type NoMatchingRouteResponse = {
  type: "ws.error";
  reason: "no matching route";
};
type UnexpectedErrorResponse = { type: "ws.error"; reason: "unexpected error" };
type BasePartyResponses =
  | EmptyMessageResponse
  | InvalidMessageResponse
  | NoMatchingRouteResponse
  | UnexpectedErrorResponse;

export const createPartyRpc = <Context, Responses>() => {
  function createEventsHandler<const TEvents>(events: EventMap<TEvents, Context>) {
    const eventEntries = Object.entries(events).map(([type, item]) => {
      const event = item as EventDefinition<keyof TEvents, any, Context>;
      return [
        type,
        {
          type,
          onMessage: event.onMessage,
          schema: event.schema,
          assert: createAssert(event.schema),
        },
      ] as [typeof type, typeof event];
    });
    const eventsMap = new Map<keyof TEvents, EventDefinition<keyof TEvents, any, Context>>(eventEntries as any);
    const types = Object.keys(events) as Array<keyof TEvents>;
    const withType = v.object({ type: v.enumType(types as any) });

    async function onMessage(message: string | ArrayBuffer, ws: PartyKitConnection, room: PartyKitRoom, ctx: Context) {
      const decoded = decode<unknown>(message);

      if (!decoded) {
        return send(ws, { type: "ws.error", reason: "empty message" });
      }

      const parsed = v.safeParse(withType, decoded);
      if (!parsed.success) {
        return send(ws, { type: "ws.error", reason: "invalid message" });
      }

      const route = eventsMap.get(parsed.data.type);
      if (!route) {
        return send(ws, { type: "ws.error", reason: "no matching route" });
      }

      // so that we keep extra properties from the schema
      const payload = decoded;
      try {
        await route.assert(payload);
        return route.onMessage(payload as { type: keyof TEvents }, ws, room, ctx);
      } catch (err) {
        return send(ws, { type: "ws.error", reason: "unexpected error" });
      }
    }

    return {
      onMessage,
      events: Object.fromEntries(eventEntries) as unknown as {
        [EventKey in keyof TEvents]: EventDefinition<EventKey, TEvents[EventKey], Context>;
      },
      responses: {} as Responses,
      __events: events,
    };
  }

  const send = (ws: PartyKitConnection, payload: BasePartyResponses | Responses) => ws.send(JSON.stringify(payload));

  return { events: createEventsHandler, send } satisfies CreatePartyRpc<Context, Responses>;
};

// prevent TS issues when generating dts such as:
// The inferred type of 'createPartyRpc' cannot be named without a reference to ...

export type CreatePartyRpc<Context, Responses> = {
  events: <const TEvents>(events: EventMap<TEvents, Context>) => {
    onMessage: (
      message: string | ArrayBuffer,
      ws: PartyKitConnection,
      room: PartyKitRoom,
      ctx: Context,
    ) => Promise<void>;
    events: {
      [EventKey in keyof TEvents]: EventDefinition<EventKey, TEvents[EventKey], Context>;
    };
    responses: Responses;
    __events: EventMap<TEvents, Context>;
  };
  send: (ws: PartyKitConnection, payload: BasePartyResponses | Responses) => void;
};
