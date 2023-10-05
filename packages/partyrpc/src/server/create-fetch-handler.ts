import type { ExecutionContext, Request as PartyKitRequest } from "@cloudflare/workers-types";
import { Router, json, withContent } from "itty-router";
import * as v from "valibot";
import { Infer, createAssert } from "./schema-assert";
import type * as Party from "partykit/server";
import { FilterArrayByValue } from "../shared/utility.types";

export function createRoute<
  const TPath,
  const TMethod extends Method,
  const TParams extends EndpointParameters | undefined,
  const TResponse,
  UserContext,
>(
  endpoint: Endpoint<TPath, TMethod, TParams, TResponse, UserContext>,
): Endpoint<TPath, TMethod, TParams, TResponse, UserContext> {
  const input = removeUndefineds({
    body: endpoint.parameters?.body,
    query: endpoint.parameters?.query,
    header: endpoint.parameters?.header,
    // path: endpoint.parameters?.path, // TODO ?
  });
  const assert = createAssert(v.partial(v.object(input)));
  console.log(input);

  const typedFetchHandler: typeof endpoint.handler = async (req, lobby, ctx, userCtx) => {
    const url = new URL(req.url);
    const query = removeUndefineds(Object.fromEntries(url.searchParams.entries()));
    const params = removeUndefineds({
      body: req.body,
      query: Object.keys(query).length ? query : undefined,
      header: req.headers,
    });
    const result = assert(params);
    if (typeof result === "object" && "_issues" in result) {
      return { type: "fetch.error", reason: "invalid params", _issues: result._issues } as any;
    }

    // @ts-expect-error
    req.params = params;

    return endpoint.handler(req, lobby, ctx, userCtx);
  };

  return {
    method: endpoint.method,
    path: endpoint.path,
    parameters: endpoint.parameters,
    handler: typedFetchHandler,
    response: endpoint.response,
  } as Endpoint<TPath, TMethod, TParams, TResponse, UserContext>;
}

export function createFetchHandler<const TEndpoints extends readonly AnyEndpointDefinition[], UserContext>(
  endpointDefs: TEndpoints,
): PartyFetchHandler<TEndpoints, UserContext> {
  const router = Router();
  const _endpointsMap = {
    get: [] as FilterArrayByValue<TEndpoints, { method: "get" }>,
    head: [] as FilterArrayByValue<TEndpoints, { method: "head" }>,
    post: [] as FilterArrayByValue<TEndpoints, { method: "post" }>,
    put: [] as FilterArrayByValue<TEndpoints, { method: "put" }>,
    patch: [] as FilterArrayByValue<TEndpoints, { method: "patch" }>,
    delete: [] as FilterArrayByValue<TEndpoints, { method: "delete" }>,
  };

  (endpointDefs as TEndpoints extends AnyEndpointDefinition[] ? TEndpoints : never).forEach((endpoint) => {
    router[endpoint.method](endpoint.path, withContent, endpoint.handler as any);
    // @ts-expect-error
    _endpointsMap[endpoint.method].push(endpoint);
  });

  return {
    onFetch(req, lobby, ctx, userCtx) {
      return router
        .handle(req, lobby, ctx, userCtx)
        .then(json)
        .catch(() => {
          return new Response("Internal server error", { status: 500 });
        });
    },
    endpoints: endpointDefs as any,
    _endpointsMap,
  };
}

export interface PartyFetchHandler<TEndpoints extends readonly AnyEndpointDefinition[], UserContext> {
  onFetch: (
    req: PartyKitRequest,
    lobby: Party.FetchLobby,
    ctx: ExecutionContext,
    userCtx: UserContext,
  ) => Response | Promise<Response>;
  endpoints: TEndpoints;
  _endpointsMap: EndpointsMap<TEndpoints>;
}

export interface EndpointsMap<TEndpoints extends readonly AnyEndpointDefinition[]> {
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

export type Endpoint<
  TPath,
  TMethod extends Method,
  in out TParams extends EndpointParameters | undefined,
  TResponse,
  UserContext,
> = {
  path: TPath;
  method: TMethod;
  parameters?: TParams;
  response: TResponse;
  handler: TypedFetchHandler<
    undefined extends TParams ? unknown : TParams extends EndpointParameters ? InferParameters<TParams> : unknown,
    Infer<TResponse> | Promise<Infer<TResponse>>,
    UserContext
  >;
};

export type TypedFetchHandler<in TParams, TResponse, in UserContext> = (
  req: PartyKitRequest & { content: any; params: TParams },
  lobby: Party.FetchLobby,
  ctx: ExecutionContext,
  userCtx: UserContext,
) => TResponse;

export interface AnyEndpointDefinition {
  method: Method;
  path: string;
  parameters?: unknown;
  response: unknown;
  handler: TypedFetchHandler<never, unknown, never>;
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
