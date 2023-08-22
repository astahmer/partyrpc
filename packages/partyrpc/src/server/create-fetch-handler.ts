import type { ExecutionContext, Response as PartyKitResponse } from "@cloudflare/workers-types";
import { Router } from "itty-router";
import * as v from "valibot";
import { Infer, createAssert } from "./schema-assert";
import { PartyKitRoom } from "partykit/server";
import { FilterArrayByValue, Pretty } from "../shared/utility.types";

export function createRoute<const TPath, TEndpoint extends EndpointDefinition<TPath>>(endpoint: TEndpoint): TEndpoint {
  const input = removeUndefineds({
    body: endpoint.parameters?.body,
    query: endpoint.parameters?.query,
    header: endpoint.parameters?.header,
    // path: endpoint.parameters?.path, // TODO ?
  });
  const assert = createAssert(v.object(input));

  const typedFetchHandler: typeof endpoint.handler = (req, lobby, ctx) => {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    assert(
      removeUndefineds({
        body: req.body,
        query: Object.keys(query).length ? query : undefined,
        header: req.headers,
      }),
    );

    return endpoint.handler(req, lobby, ctx);
  };

  return {
    method: endpoint.method,
    path: endpoint.path,
    handler: typedFetchHandler,
    response: endpoint.response,
    parameters: endpoint.parameters,
  } as TEndpoint;
}

export function createFetchHandler<const TEndpoints extends readonly EndpointDefinition<unknown>[]>(
  endpointDefs: TEndpoints,
): PartyFetchHandler<TEndpoints> {
  const router = Router();
  const _endpointsMap = {
    get: [] as FilterArrayByValue<TEndpoints, { method: "get" }>,
    head: [] as FilterArrayByValue<TEndpoints, { method: "head" }>,
    post: [] as FilterArrayByValue<TEndpoints, { method: "post" }>,
    put: [] as FilterArrayByValue<TEndpoints, { method: "put" }>,
    patch: [] as FilterArrayByValue<TEndpoints, { method: "patch" }>,
    delete: [] as FilterArrayByValue<TEndpoints, { method: "delete" }>,
  };

  (endpointDefs as TEndpoints extends EndpointDefinition<string>[] ? TEndpoints : never).forEach((endpoint) => {
    router[endpoint.method](endpoint.path, endpoint.handler);
    // @ts-expect-error
    _endpointsMap[endpoint.method].push(endpoint);
  });

  return {
    onRequest(req, lobby, ctx) {
      return router.handle(req, lobby, ctx);
    },
    endpoints: endpointDefs as any,
    _endpointsMap,
  };
}

export interface PartyFetchHandler<TEndpoints extends readonly EndpointDefinition<unknown>[]> {
  onRequest: (
    req: Request,
    lobby: { env: Record<string, unknown>; parties: PartyKitRoom["parties"] },
    ctx: ExecutionContext,
  ) => UserDefinedResponse | Promise<UserDefinedResponse>;
  endpoints: TEndpoints;
  _endpointsMap: EndpointsMap<TEndpoints>;
}

export interface EndpointsMap<TEndpoints extends readonly EndpointDefinition<unknown>[]> {
  get: FilterArrayByValue<TEndpoints, { method: "get" }>;
  head: FilterArrayByValue<TEndpoints, { method: "head" }>;
  post: FilterArrayByValue<TEndpoints, { method: "post" }>;
  put: FilterArrayByValue<TEndpoints, { method: "put" }>;
  patch: FilterArrayByValue<TEndpoints, { method: "patch" }>;
  delete: FilterArrayByValue<TEndpoints, { method: "delete" }>;
}

export interface EndpointParameters {
  body?: unknown;
  query?: Record<string, unknown>;
  header?: Record<string, unknown>;
}
export type InferParameters<TParams extends EndpointParameters> = {
  [K in keyof TParams]: Infer<TParams[K]>;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | MutationMethod;

export interface DefaultEndpoint {
  parameters?: EndpointParameters | undefined;
  response: unknown;
}

// https://github.com/partykit/partykit/blob/18c0543ded591ea26b60a1970ce69d03779de103/packages/partykit/src/server.ts#L15
// Because when you construct a `new Response()` in a user script,
// it's assumed to be a standards-based Fetch API Response, unless overridden.
// This is fine by us, let user return whichever response type.
type FetchResponse = Response;
type UserDefinedResponse = FetchResponse | PartyKitResponse;

export type TypedFetchHandler<TParams extends EndpointParameters | undefined> = (
  // req: Request & (TParams extends EndpointParameters ? { params: InferParameters<TParams> } : {}),
  req: Request &
    (TParams extends undefined
      ? never
      : { params: InferParameters<TParams extends EndpointParameters ? TParams : never> }),
  lobby: {
    env: Record<string, unknown>;
    parties: PartyKitRoom["parties"];
  },
  ctx: ExecutionContext,
) => UserDefinedResponse | Promise<UserDefinedResponse>;

export interface EndpointDefinition<TPath, TConfig extends DefaultEndpoint = DefaultEndpoint> {
  method: Method;
  path: TPath;
  handler: TypedFetchHandler<TConfig["parameters"]>;
  parameters?: TConfig["parameters"];
  response: TConfig["response"];
}

/** Remove undefined properties in object */
const removeUndefineds = <Value = Record<string, unknown>>(obj: Value) =>
  Object.keys(obj as any).reduce(
    (acc, key) => ({
      ...acc,
      ...(obj[key as keyof typeof obj] !== undefined && {
        [key]: obj[key as keyof typeof obj],
      }),
    }),
    {},
  );

const router = createFetchHandler([
  createRoute({
    method: "get",
    path: "/",
    // parameters: {
    //   body: v.object({
    //     title: v.string(),
    //   }),
    // },
    response: v.object({ res: v.string() }),
    handler: (req) => {
      req.params;
      return new Response("hello");
    },
  }),
  createRoute({
    method: "post",
    path: "/non",
    response: v.object({ nonon: v.number() }),
    handler: (req) => {
      req.params;
      return new Response("hello");
    },
  }),
]);

router.endpoints;
//     ^?

// router._types;
//      ^?

// router._endpointsMap.
//      ^?

// type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
//   method: Method;
//   path: string;
//   parameters?: TConfig["parameters"];
//   response: TConfig["response"];
// };
