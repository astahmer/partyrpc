import * as React from "react";
import useEvent from "./use-event-callback";
import { PartyClient } from "../client/create-party-client";
import { WebSocketEventMap } from "partysocket/ws";

export const createPartyHooks = <TClient extends PartyClient<any, any>>(client: TClient) => {
  type ResponseType = TClient["_responses"]["type"];
  type ResponseByType<TType extends ResponseType> = Extract<TClient["_responses"], { type: TType }>;

  const useSocketEvent = <TType extends keyof WebSocketEventMap>(
    type: TType,
    callback: (message: ResponseByType<TType>) => void,
  ) => {
    const handleEvent = useEvent(callback);

    React.useEffect(() => {
      if (!client.wsListeners.has(type)) {
        client.wsListeners.set(type, new Set());
      }

      const listeners = client.wsListeners.get(type)!;
      listeners.add(handleEvent);
      return () => {
        listeners.delete(handleEvent);
      };
    }, [handleEvent]);

    return useEvent(callback);
  };

  const usePartyMessage = <TType extends ResponseType>(
    type: TType,
    callback: (message: ResponseByType<TType>) => void,
  ) => {
    const handleEvent = useEvent(callback);
    let _type = type as string; // idk TS needs it

    React.useEffect(() => {
      if (!client.responsesListeners.has(_type)) {
        client.responsesListeners.set(_type, new Set());
      }

      const listeners = client.responsesListeners.get(_type)!;
      listeners.add(handleEvent);
      return () => {
        listeners.delete(handleEvent);
      };
    }, [handleEvent]);

    return useEvent(callback);
  };

  return { useSocketEvent, usePartyMessage };
};
