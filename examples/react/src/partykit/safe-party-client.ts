import PartySocket from "partysocket";
import { createPartyHooks } from "partyrpc/react";
import { createPartyClient } from "partyrpc/client";
import { SafePartyEvents, SafePartyResponses } from "../../partykit/safe-party";

const host = "localhost:1999";

const partySocket = new PartySocket({ host, room: "some-room" });

export const client = createPartyClient<SafePartyEvents, SafePartyResponses>(partySocket, { debug: true });
export const { usePartyMessage, useSocketEvent } = createPartyHooks(client);
