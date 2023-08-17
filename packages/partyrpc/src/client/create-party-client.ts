import PartySocket from "partysocket";
import * as v from "valibot";
import type { AnyEventMap } from "../server/create-party-rpc";
import { WebSocketEventMap } from "partysocket/ws";

type Infer<TSchema> = TSchema extends v.BaseSchema ? v.Output<TSchema> : never;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type AnyResponse = { type: string };

export function createPartyClient<Events extends AnyEventMap, Responses extends AnyResponse>(
  socket: PartySocket,
  options?: { debug: boolean },
): PartyClient<Events, Responses> {
  function send<T extends keyof Events>(message: PartyEventByType<Events, T>) {
    socket.send(JSON.stringify(message));
  }

  const responsesListeners = new Map<string, Set<Function>>();
  socket.addEventListener("message", (event: MessageEvent) => {
    const message = JSON.parse(event.data) as Responses;
    if (options?.debug) console.log("[party:message]", message);

    const listeners = responsesListeners.get(message.type);
    if (!listeners) return;

    listeners.forEach((listener) => {
      listener(message);
    });
  });

  const on = <TType extends Responses["type"]>(
    type: TType,
    callback: (response: PartyResponseByType<Responses, TType>) => void,
  ) => {
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

  const wsListeners = new Map<keyof WebSocketEventMap, Set<Function>>();
  const makeEventListener = (type: keyof WebSocketEventMap): EventListener => {
    return (event) => {
      if (options?.debug) console.log(`[party:${type}]`);

      const listeners = wsListeners.get(type);
      if (!listeners) return;

      listeners.forEach((listener) => {
        listener(event);
      });
    };
  };

  const onSocket = <TType extends keyof WebSocketEventMap>(type: TType, callback: (event: Event) => void) => {
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
    send,
    on,
    onSocket,
    unsubscribe,
    wsListeners,
    responsesListeners,
    _events: {} as Events,
    _responses: {} as Responses,
    // mostly for typechecking
  } satisfies PartyClient<Events, Responses>;

  return client as PartyClient<Events, Responses>;
}

export type PartyEventByType<Events extends AnyEventMap, TType extends keyof Events> = Events[TType]["schema"] extends
  | v.NeverSchema
  | never
  ? { type: TType }
  : Pretty<{ type: TType } & Infer<Events[TType]["schema"]>>;

export type PartyResponseByType<TResponses extends AnyResponse, TType extends TResponses["type"]> = Extract<
  TResponses,
  { type: TType }
>;

export type PartyClient<TEvents extends AnyEventMap, TResponses extends AnyResponse> = {
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
