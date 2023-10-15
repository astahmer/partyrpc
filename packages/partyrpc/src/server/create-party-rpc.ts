import * as v from "valibot";

import Party from "partykit/server";

type Pretty<T> = { [K in keyof T]: T[K] } & {};

// Compatiblity layer for the future migration to typeschema
type Schema = v.BaseSchema;
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
      _issues: result.error.issues.map(vIssuesToValidationIssues),
    };
  };
};

const vIssuesToValidationIssues = ({ message, path }: v.Issue) => {
  return new ValidationIssue(
    message,
    path?.map(({ key }) => key),
  );
};
//

type TypedHandler<TSchema, Context> = (
  message: TSchema,
  ws: Party.Connection,
  room: Party.Party,
  ctx: Context,
) => void | Promise<void>;

type CreateAssert<TSchema extends Schema> = (
  schema: TSchema,
) => (data: unknown) => Promise<Infer<TSchema> | { _issues: ValidationIssue[] }>;

type AssertReturn<TSchema> = Infer<TSchema> | { _issues: ValidationIssue[] };

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
const decode = <Message = any>(message: ArrayBuffer | string) => {
  try {
    const data = message instanceof ArrayBuffer ? decoder.decode(message) : message;
    return JSON.parse(data) as Message;
  } catch (err) {
    return;
  }
};

type EmptyMessageResponse = { type: "ws.error"; reason: "empty message" };
type InvalidMessageResponse = { type: "ws.error"; reason: "invalid message"; _issues: ValidationIssue[] };
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

export const createPartyRpc = <Responses, Context = {}>() => {
  const send: PartyResponseHelpers<Responses>["send"] = (ws, message) => ws.send(JSON.stringify(message));

  const broadcast: PartyResponseHelpers<Responses>["broadcast"] = (room, message, without) =>
    room.broadcast(JSON.stringify(message), without);

  const create: PartyResponseHelpers<Responses>["create"] = (message) => {
    return message;
  };

  function createEventsHandler<const TEvents>(events: EventMap<TEvents, Context>) {
    const eventEntries = Object.entries(events).map(([type, item]) => {
      const event = item as EventDefinition<keyof TEvents, any, Context>;
      return [type, { type, onMessage: event.onMessage, schema: event.schema, assert: createAssert(event.schema) }] as [
        typeof type,
        typeof event,
      ];
    });

    const eventsMap = new Map<keyof TEvents, EventDefinition<keyof TEvents, unknown, Context>>(eventEntries as any);
    const types = Object.keys(events) as Array<keyof TEvents>;
    const withType = v.object({ type: v.enumType(types as any) });

    async function onMessage(msg: string | ArrayBuffer, ws: Party.Connection, room: Party.Party, ctx: Context) {
      const decoded = decode<unknown>(msg);

      if (!decoded) {
        return send(ws, { type: "ws.error", reason: "empty message" });
      }

      const parsed = v.safeParse(withType, decoded);
      if (!parsed.success) {
        return send(ws, {
          type: "ws.error",
          reason: "invalid message",
          _issues: parsed.error.issues.map(vIssuesToValidationIssues),
        });
      }

      const route = eventsMap.get(parsed.data.type);
      if (!route) {
        return send(ws, { type: "ws.error", reason: "no matching route" });
      }

      // so that we keep extra properties from the schema
      const message = decoded as { type: keyof TEvents };
      try {
        const result = (await route.assert(message)) as AssertReturn<unknown>;
        if (typeof result === "object" && "issues" in result) {
          return send(ws, { type: "ws.error", reason: "invalid message", _issues: result._issues });
        }

        return route.onMessage(message, ws, room, ctx);
      } catch (err) {
        return send(ws, { type: "ws.error", reason: "unexpected error" });
      }
    }

    const eventDefs = Object.fromEntries(eventEntries) as unknown as EventDefinitionMap<TEvents, Context>;

    return { send, broadcast, create, onMessage, events: eventDefs, responses: {} as Responses, __events: events };
  }

  // use satifisies for typechecking, use as to return a pretty name
  return { send, broadcast, create, events: createEventsHandler } satisfies CreatePartyRpc<
    Responses,
    Context
  > as CreatePartyRpc<Responses, Context>;
};

// prevent TS issues when generating dts such as:
// The inferred type of 'createPartyRpc' cannot be named without a reference to ...

export type PartyResponseHelpers<Responses> = {
  send: <Message extends BasePartyResponses | Responses>(ws: Party.Connection, message: Message) => void;
  broadcast: <Message extends BasePartyResponses | Responses>(
    room: Party.Party,
    message: Message,
    without?: string[] | undefined,
  ) => void;
  create: <Message extends Responses | BasePartyResponses>(message: Message) => Message;
};

export type CreatePartyRpc<Responses, Context> = PartyResponseHelpers<Responses> & {
  events: <const TEvents>(events: EventMap<TEvents, Context>) => PartyRpcEvents<TEvents, Responses, Context>;
};

type EventDefinitionMap<TEvents, Context> = {
  [EventKey in keyof TEvents]: EventDefinition<EventKey, TEvents[EventKey], Context>;
};

export type PartyRpcEvents<TEvents, Responses, Context> = PartyResponseHelpers<Responses> & {
  onMessage: (message: string | ArrayBuffer, ws: Party.Connection, room: Party.Party, ctx: Context) => Promise<void>;
  events: EventDefinitionMap<TEvents, Context>;
  responses: Responses;
  __events: EventMap<TEvents, Context>;
};
