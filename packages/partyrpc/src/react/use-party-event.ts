import * as React from "react";
import useEvent from "./use-event-callback";
import { PartyClient } from "../client/create-party-client";

export const createPartyHooks = <TClient extends PartyClient<any, any>>(client: TClient) => {
  type ResponseType = TClient["_responses"]["type"];
  type ResponseByType<TType extends ResponseType> = Extract<TClient["_responses"], { type: TType }>;

  const usePartyEvent = <TType extends ResponseType>(
    type: TType,
    callback: (payload: ResponseByType<TType>) => void,
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

  return { usePartyEvent };
};
