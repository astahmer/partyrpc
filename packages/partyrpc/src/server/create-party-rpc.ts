import * as v from "valibot";
import type * as Party from "partykit/server";
import {
  AnyEndpointDefinition,
  Endpoint,
  EndpointParameters,
  Method,
  PartyFetchHandler,
  createFetchHandler,
  createRoute,
} from "./create-fetch-handler";
import { AnySchema, Infer, createAssert, vIssuesToValidationIssues, ValidationIssue } from "./schema-assert";
import type { Pretty } from "../shared/utility.types";

type TypedHandler<TSchema, UserContext> = (
  message: TSchema,
  ws: Party.Connection,
  party: Party.Party,
  ctx: UserContext,
) => void | Promise<void>;

type CreateAssert<TSchema extends AnySchema> = (
  schema: TSchema,
) => (data: unknown) => Promise<Infer<TSchema> | { _issues: ValidationIssue[] }>;

type AssertReturn<TSchema> = Infer<TSchema> | { _issues: ValidationIssue[] };

type EventDefinition<TType, TSchema, UserContext> = EventItem<TSchema, TType, UserContext> & {
  type: TType;
  assert: ReturnType<CreateAssert<TSchema extends AnySchema ? TSchema : AnySchema>>;
};
export type AnyEventMap = {
  [K: string]: {
    schema: unknown;
    onMessage: TypedHandler<any, any>;
  };
};

type EventItem<out TSchema, Key, in UserContext> = {
  schema: TSchema;
  onMessage: Infer<TSchema> extends never | v.NeverSchema<undefined>
    ? TypedHandler<{ type: Key }, UserContext>
    : TypedHandler<Pretty<Infer<TSchema> & { type: Key }>, UserContext>;
};

type EventMap<out E, UserContext> = {
  [K in keyof E]: EventItem<E[K], K, UserContext>;
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
type AnyErrorResponse = {
  type: "ws.error";
  reason: string;
};
type BasePartyResponses =
  | EmptyMessageResponse
  | InvalidMessageResponse
  | NoMatchingRouteResponse
  | UnexpectedErrorResponse
  | AnyErrorResponse;

export const createPartyRpc = <Responses, UserContext = {}>() => {
  const send: PartyResponseHelpers<Responses>["send"] = (ws, message) => ws.send(JSON.stringify(message));

  const broadcast: PartyResponseHelpers<Responses>["broadcast"] = (room, message, without) =>
    room.broadcast(JSON.stringify(message), without);

  const create: PartyResponseHelpers<Responses>["create"] = (message) => {
    return message;
  };

  function createEventsHandler<const TEvents>(events: EventMap<TEvents, UserContext>) {
    const eventEntries = Object.entries(events).map(([type, item]) => {
      const event = item as EventDefinition<keyof TEvents, any, UserContext>;
      return [type, { type, onMessage: event.onMessage, schema: event.schema, assert: createAssert(event.schema) }] as [
        typeof type,
        typeof event,
      ];
    });

    const eventsMap = new Map<keyof TEvents, EventDefinition<keyof TEvents, unknown, UserContext>>(eventEntries as any);
    const types = Object.keys(events) as Array<keyof TEvents>;
    const withType = v.object({ type: v.enum(types as any) });

    const onMessage: TypedHandler<string | ArrayBuffer, UserContext> = async (msg, ws, room, ctx) => {
      const decoded = decode<unknown>(msg);

      if (!decoded) {
        return send(ws, { type: "ws.error", reason: "empty message" });
      }

      const parsed = v.safeParse(withType, decoded);
      if (!parsed.success) {
        return send(ws, {
          type: "ws.error",
          reason: "invalid message",
          _issues: parsed.issues.map(vIssuesToValidationIssues),
        });
      }

      const route = eventsMap.get(parsed.output.type);
      if (!route) {
        return send(ws, { type: "ws.error", reason: "no matching route" });
      }

      // so that we keep extra properties from the schema
      const message = decoded as { type: keyof TEvents };
      try {
        const result = (await route.assert(message)) as AssertReturn<unknown>;
        if (typeof result === "object" && "_issues" in result) {
          return send(ws, { type: "ws.error", reason: "invalid message", _issues: result._issues });
        }

        return route.onMessage(message, ws, room, ctx);
      } catch (err) {
        return send(ws, { type: "ws.error", reason: "unexpected error" });
      }
    };

    const eventDefs = Object.fromEntries(eventEntries) as unknown as EventDefinitionMap<TEvents, UserContext>;

    return { send, broadcast, create, onMessage, events: eventDefs, responses: {} as Responses, __events: events };
  }

  // use satifisies for typechecking, use as to return a pretty name
  return {
    send,
    broadcast,
    create,
    events: createEventsHandler,
    endpoints: createFetchHandler,
    route: createRoute,
  } satisfies CreatePartyRpc<Responses, UserContext> as CreatePartyRpc<Responses, UserContext>;
};

// prevent TS issues when generating dts such as:
// The inferred type of 'createPartyRpc' cannot be named without a reference to ...

export type PartyResponseHelpers<Responses> = {
  send: <Message extends BasePartyResponses | Responses>(ws: Party.Connection, message: Message) => void;
  broadcast: <Message extends BasePartyResponses | Responses>(
    party: Party.Party,
    message: Message,
    without?: string[] | undefined,
  ) => void;
  create: <Message extends Responses | BasePartyResponses>(message: Message) => Message;
};

export type CreatePartyRpc<Responses, UserContext> = PartyResponseHelpers<Responses> & {
  events: <const TEvents>(events: EventMap<TEvents, UserContext>) => PartyRpcEvents<TEvents, Responses, UserContext>;
  endpoints: <const TEndpoints extends readonly AnyEndpointDefinition[], UserContext>(
    endpoints: TEndpoints,
  ) => PartyFetchHandler<TEndpoints, UserContext>;
  route: <
    const TPath,
    const TMethod extends Method,
    const TParams extends TMethod extends "post"
      ? EndpointParameters<TMethod>
      : EndpointParameters<TMethod> | undefined,
    const TResponse,
  >(
    endpoint: Endpoint<TPath, TMethod, TParams, TResponse, UserContext>,
  ) => Endpoint<TPath, TMethod, TParams, TResponse, UserContext>;
};

type EventDefinitionMap<TEvents, Context> = {
  [EventKey in keyof TEvents]: EventDefinition<EventKey, TEvents[EventKey], Context>;
};

export type PartyRpcEvents<TEvents, Responses, UserContext> = PartyResponseHelpers<Responses> & {
  onMessage: TypedHandler<string | ArrayBuffer, UserContext>;
  events: EventDefinitionMap<TEvents, UserContext>;
  responses: Responses;
  __events: EventMap<TEvents, UserContext>;
};
