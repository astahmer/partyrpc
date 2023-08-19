# CHANGELOG

All notable changes to this project will be documented in this file.

## [0.1.0] - 2023-08-20

### Added

Added `create` identity fn to create typesafe messages and send them later. Available both on `createPartyRpc` and
`createPartyClient`.

```ts
const p = createPartyRpc<PartyResponses>();

const msg = p.create({
  // typesafe message
  type: "update",
  id: websocket.id,
  x: position.x,
  y: position.y,
  pointer: position.pointer,
  country: attachment.country,
});

const { type, ...cursor } = msg;
websocket.serializeAttachment(cursor); // use it however you want
p.broadcast(room, msg, [websocket.id]); // send it later
```

---

Added `options.debug` as string to only log what you need.

```ts
const client = createPartyClient<PartyEvents, PartyResponses>(socket, { debug: "sync" }); // will only log message with { type: "sync" }
```

---

Expose `send` and `broadcast` helper fns on the return of `createPartyRpc().events()` so that you only need to export
this one

```ts
const p = createPartyRpc<PartyResponses>(); // no need to export p anymore !
export const niceParty = p.events({
  // ...
});

// ...
niceParty.send(websocket, { ... });
```

---

Expose `socket` on the return of `createPartyClient()`, same reason, so that you only need to export this one

```ts
const socket = new PartySocket({ host: envConfig.PARTYKIT_HOST, room: "main" });
export const client = createPartyClient<PartyEvents, PartyResponses>(socket);

client.socket; // new !
```

---

Added the 3rd argument (`withoutIds`) to `createPartyRpc().broadcast()` to allow you to exclude some ids.

### Changed

Renamed `AnyResponse` type to `AnyResponseMessage` to be more explicit.

---

## [0.1.0] - 2023-08-17

### Added

Added `useSocketEvent` to hook into base socket events (`open`, `close`, `error`, `message`).

```ts
const { useSocketEvent } = createPartyHooks(client);

useSocketEvent("open", () => {
  console.log("socket opened");
});
```

Added `unsubscribe` fn in client, to unsubscribe from all listeners.

```ts
const { unsubscribe } = createPartyHooks(client);

useEffect(() => {
  // do stuff ...
  return () => {
    client.unsubscribe();
  };
}, []);
```

### Changed

Renamed `usePartyEvent` to `usePartyMessage` to be more explicit.

## [0.0.3] - 2023-08-17

### Added

Add generic on `send` helper fn, to allow overriding or forcing a specific type.

```diff
- const send = (ws: PartyKitConnection, message: BasePartyResponses | Responses) => ws.send(JSON.stringify(message));
+ const send = <T extends BasePartyResponses | Responses>(ws: PartyKitConnection, message: T) => ws.send(JSON.stringify(message));
```

Add `broadcast` helper fn:

```ts
const broadcast = <Message extends BasePartyResponses | Responses>(room: PartyKitRoom, payload: Message) =>
  room.broadcast(JSON.stringify(payload));
```

## [0.0.2] - 2023-08-16

### Changed

Swap order of generics of `createPartyRpc`, make `Context` optional.

```diff
- export const createPartyRpc = <Context, Responses>() => {}
+ export const createPartyRpc = <Responses, Context>() => {}
```

## [0.0.2] - 2023-08-16

### Fixed

Add missing .d.ts files (for the multi-entrypoint) that were not included in the npm package.

## [0.0.1] - 2023-08-16

Baseline Release 🎉
