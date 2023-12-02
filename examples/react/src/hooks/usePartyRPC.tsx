import { createContext, useMemo, useContext, PropsWithChildren, FC } from "react";
import { createPartyHooks } from "partyrpc/react";
import { createPartyClient } from "partyrpc/client";
import PartySocket from "partysocket";
import { UseSocketEvent, UsePartyMessage, TypedClient } from "./partyRPCTypes";
import { SafePartyEvents, SafePartyResponses } from "../../partykit/safe-party";

const host = "localhost:1999";

export const PartySocketContext = createContext<{
  partySocket: PartySocket | null;
  client: TypedClient | null;
  useSocketEvent: UseSocketEvent | null;
  usePartyMessage: UsePartyMessage | null;
}>({
  partySocket: null,
  client: null,
  useSocketEvent: null,
  usePartyMessage: null,
});

type PartySocketProviderProps = PropsWithChildren<{
  idRoom: string;
}>;

export const PartySocketProvider: FC<PartySocketProviderProps> = ({ children, idRoom }) => {
  const partySocket = useMemo<PartySocket>(() => new PartySocket({ host, room: idRoom }), []);

  const client = createPartyClient<SafePartyEvents, SafePartyResponses>(partySocket, { debug: true });
  const { usePartyMessage, useSocketEvent } = createPartyHooks(client);

  // usePartyMessage("ping", (data) => {
  // for example if use jotai or any state management library
  //   setStore((store) => ({
  //     ...
  //   }));
  // });

  return (
    <PartySocketContext.Provider
      value={{
        client,
        partySocket,
        useSocketEvent,
        usePartyMessage,
      }}
    >
      {children}
    </PartySocketContext.Provider>
  );
};

export const usePartyRPC = () => {
  const context = useContext(PartySocketContext);
  if (!context.partySocket || !context.client || !context.usePartyMessage || !context.useSocketEvent)
    throw new Error("useWS must be used inside a PartySocketProvider");

  return {
    sendEvent: context.client.send,
    usePartyMessage: context.usePartyMessage,
    useSocketEvent: context.useSocketEvent,
  };
};
