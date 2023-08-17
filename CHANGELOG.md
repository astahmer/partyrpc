# CHANGELOG

All notable changes to this project will be documented in this file.

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
