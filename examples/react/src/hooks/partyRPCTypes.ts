import { PartyClient } from "partyrpc/client";
import { SafePartyResponses, SafePartyEvents } from "../../partykit/safe-party";

export type TypedClient = PartyClient<SafePartyEvents, SafePartyResponses>;

export type PartyHooks = {
  useSocketEvent: <TType extends keyof WebSocketEventMap>(
    type: TType,
    callback: (
      message: Extract<
        TypedClient["_responses"],
        {
          type: TType;
        }
      >,
    ) => void,
  ) => (
    message: Extract<
      TypedClient["_responses"],
      {
        type: TType;
      }
    >,
  ) => void;
  usePartyMessage: <TType_1 extends TypedClient["_responses"]["type"]>(
    type: TType_1,
    callback: (
      message: Extract<
        TypedClient["_responses"],
        {
          type: TType_1;
        }
      >,
    ) => void,
  ) => (
    message: Extract<
      TypedClient["_responses"],
      {
        type: TType_1;
      }
    >,
  ) => void;
};

export type UseSocketEvent = PartyHooks["useSocketEvent"];
export type UsePartyMessage = PartyHooks["usePartyMessage"];
