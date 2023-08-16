import PartySocket from "partysocket";
import * as v from "valibot";
import type { AnyEventMap } from "../server/create-party-rpc";

type Infer<TSchema> = TSchema extends v.BaseSchema ? v.Output<TSchema> : never;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type AnyResponse = { type: string };

export function createPartyClient<
  Events extends AnyEventMap,
  Responses extends AnyResponse
>(
  socket: PartySocket,
  options?: { debug: boolean }
): PartyClient<Events, Responses> {
  function send<T extends keyof Events>(payload: PartyEventByType<Events, T>) {
    socket.send(JSON.stringify(payload));
  }

  const responsesListeners = new Map<string, Set<Function>>();
  socket.addEventListener("message", (event: MessageEvent) => {
    const message = JSON.parse(event.data) as Responses;
    const listeners = responsesListeners.get(message.type);
    if (!listeners) return;

    if (options?.debug) console.log("[party]", message);

    listeners.forEach((listener) => {
      listener(message);
    });
  });

  socket.addEventListener("close", () => {
    responsesListeners.clear();
  });

  const on = <TType extends Responses["type"]>(
    type: TType,
    callback: (response: PartyResponseByType<Responses, TType>) => void
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

  const client = {
    send,
    on,
    responsesListeners,
    _events: {} as Events,
    _responses: {} as Responses,
  };
  return client;
}

export type PartyEventByType<
  Events extends AnyEventMap,
  TType extends keyof Events
> = Events[TType]["schema"] extends v.NeverSchema | never
  ? { type: TType }
  : Pretty<{ type: TType } & Infer<Events[TType]["schema"]>>;

export type PartyResponseByType<
  TResponses extends AnyResponse,
  TType extends TResponses["type"]
> = Extract<TResponses, { type: TType }>;

export type PartyClient<
  TEvents extends AnyEventMap,
  TResponses extends AnyResponse
> = {
  send: <T extends keyof TEvents>(
    payload: PartyEventByType<TEvents, T>
  ) => void;
  on: <TType extends TResponses["type"]>(
    type: TType,
    callback: (response: PartyResponseByType<TResponses, TType>) => void
  ) => () => void;
  responsesListeners: Map<string, Set<Function>>;
  _events: TEvents;
  _responses: TResponses;
};
