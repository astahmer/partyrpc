import PartySocket from "partysocket";
import * as v from "valibot";
import type { AnyEventMap } from "../server/create-party-rpc";
import { WebSocketEventMap } from "partysocket/ws";

type Infer<TSchema> = TSchema extends v.BaseSchema ? v.Output<TSchema> : never;
type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type AnyResponseMessage = { type: string };

export function createPartyClient<TEvents extends AnyEventMap, TResponses extends AnyResponseMessage>(
  socket: PartySocket,
  options?: { debug?: boolean | string },
): PartyClient<TEvents, TResponses> {
  const create: PartyClient<TEvents, TResponses>["create"] = (message) => message;
  const send: PartyClient<TEvents, TResponses>["send"] = (message) => socket.send(JSON.stringify(message));

  let debug: (type: keyof WebSocketEventMap, message?: AnyResponseMessage) => void = () => {};
  const _debugValue = options?.debug;
  if (_debugValue) {
    if (typeof _debugValue === "string") {
      debug = (type: keyof WebSocketEventMap, message?: AnyResponseMessage) => {
        if (type === "message" && message) {
          if (!message.type.startsWith(_debugValue)) return;
        }

        return console.log(`[party:${type}]`, message);
      };
    } else {
      debug = (type: keyof WebSocketEventMap, message?: AnyResponseMessage) => console.log(`[party:${type}]`, message);
    }
  }

  const responsesListeners: PartyClient<TEvents, TResponses>["responsesListeners"] = new Map();
  socket.addEventListener("message", (event: MessageEvent) => {
    const message = JSON.parse(event.data) as TResponses;
    debug("message", message);

    const listeners = responsesListeners.get(message.type);
    if (!listeners) return;

    listeners.forEach((listener) => {
      listener(message);
    });
  });

  const on: PartyClient<TEvents, TResponses>["on"] = (type, callback) => {
    const _type = type as string; // idk TS needs it
    if (!responsesListeners.has(_type)) {
      responsesListeners.set(_type, new Set());
    }

    const listeners = responsesListeners.get(_type)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  };

  const wsListeners: PartyClient<TEvents, TResponses>["wsListeners"] = new Map();
  const makeEventListener = (type: keyof WebSocketEventMap): EventListener => {
    return (event) => {
      debug(type);

      const listeners = wsListeners.get(type);
      if (!listeners) return;

      listeners.forEach((listener) => {
        listener(event);
      });
    };
  };

  const onSocket: PartyClient<TEvents, TResponses>["onSocket"] = (type, callback) => {
    if (!wsListeners.has(type)) {
      wsListeners.set(type, new Set());
    }

    const listeners = wsListeners.get(type)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  };

  const onOpen = makeEventListener("open");
  const onError = makeEventListener("error");
  const onClose = makeEventListener("close");

  socket.addEventListener("open", onOpen);
  socket.addEventListener("error", onError);
  socket.addEventListener("close", onClose);

  const unsubscribe = () => {
    socket.removeEventListener("open", onOpen);
    socket.removeEventListener("error", onError);
    socket.removeEventListener("close", onClose);

    responsesListeners.clear();
    wsListeners.clear();
  };

  const client = {
    socket,
    create,
    send,
    on,
    onSocket,
    unsubscribe,
    wsListeners,
    responsesListeners,
    _events: {} as TEvents,
    _responses: {} as TResponses,
    // mostly for typechecking
  } satisfies PartyClient<TEvents, TResponses>;

  //  use as to return a pretty name
  return client as PartyClient<TEvents, TResponses>;
}

export type PartyEventByType<Events extends AnyEventMap, TType extends keyof Events> = Events[TType]["schema"] extends
  | v.NeverSchema
  | never
  ? { type: TType }
  : Pretty<{ type: TType } & Infer<Events[TType]["schema"]>>;

export type PartyResponseByType<TResponses extends AnyResponseMessage, TType extends TResponses["type"]> = Extract<
  TResponses,
  { type: TType }
>;

export type PartyClient<TEvents extends AnyEventMap, TResponses extends AnyResponseMessage> = {
  socket: PartySocket;
  create: <T extends keyof TEvents>(message: PartyEventByType<TEvents, T>) => PartyEventByType<TEvents, T>;
  send: <T extends keyof TEvents>(message: PartyEventByType<TEvents, T>) => void;
  on: <TType extends TResponses["type"]>(
    type: TType,
    callback: (response: PartyResponseByType<TResponses, TType>) => void,
  ) => () => void;
  onSocket: <TType extends keyof WebSocketEventMap>(type: TType, callback: (event: Event) => void) => () => void;
  /** Remove/clear all listeners */
  unsubscribe: () => void;
  wsListeners: Map<keyof WebSocketEventMap, Set<Function>>;
  responsesListeners: Map<string, Set<Function>>;
  _events: TEvents;
  _responses: TResponses;
};
