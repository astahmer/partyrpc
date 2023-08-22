import {
  Method,
  EndpointParameters,
  EndpointsMap,
  EndpointDefinition,
  createFetchHandler,
  createRoute,
  InferParameters,
} from "../server/create-fetch-handler";
import * as v from "valibot";
import { Infer } from "../server/schema-assert";
import { FilterArrayByValue, FindArrayByValue } from "../shared/utility.types";

export type Fetcher = (
  method: Method,
  url: string,
  parameters?: EndpointParameters | undefined,
) => Promise<EndpointDefinition<unknown>["response"]>;

export class ApiClient<
  TEndpoints extends readonly EndpointDefinition<unknown>[],
  TEndpointMap extends EndpointsMap<TEndpoints> = EndpointsMap<TEndpoints>,
> {
  baseUrl: string = "";

  constructor(public routes: TEndpoints, public fetcher: Fetcher) {}

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  find<
    TPath extends TEndpoints[number]["path"],
    TByMethod extends FilterArrayByValue<TEndpoints, { path: TPath }>,
    TEndpoint extends FindArrayByValue<TEndpoints, { path: TPath; method: TByMethod[number]["method"] }>,
  >(path: TPath, method: TByMethod extends never ? never : TByMethod[number]["method"]) {
    return this.routes.find((route) => route.path === path && route.method === method) as TEndpoint;
  }

  get<
    Path extends TEndpointMap["get"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["get"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("get", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }

  post<
    Path extends TEndpointMap["post"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["post"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("post", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }

  put<
    Path extends TEndpointMap["put"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["put"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("put", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }

  patch<
    Path extends TEndpointMap["patch"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["patch"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("patch", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }

  delete<
    Path extends TEndpointMap["delete"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["delete"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("delete", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }

  head<
    Path extends TEndpointMap["head"][number]["path"],
    TEndpoint extends FindArrayByValue<TEndpointMap["head"], { path: Path }>,
  >(
    path: Path,
    ...params: MaybeOptionalArg<InferParameters<TEndpoint["parameters"]>>
  ): Promise<Infer<TEndpoint["response"]>> {
    return this.fetcher("head", this.baseUrl + path, params[0]) as Promise<Infer<TEndpoint["response"]>>;
  }
}

/**
 Example usage:

 ```ts
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));
 ```
*/
export function createApiClient<TEndpoints extends readonly EndpointDefinition<unknown>[]>(
  endpoints: TEndpoints,
  fetcher: Fetcher,
  baseUrl?: string,
) {
  return new ApiClient(endpoints, fetcher).setBaseUrl(baseUrl ?? "");
}

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];

const router = createFetchHandler([
  createRoute({
    method: "get",
    path: "/gagaga",
    parameters: {
      body: v.object({ title: v.string() }),
    },
    response: v.object({ res: v.string() }),
    handler: (req) => {
      req.params;
      return new Response("hello");
    },
  }),
  createRoute({
    method: "post",
    path: "/gagaga",
    parameters: {
      body: v.object({ dfsfqds: v.string() }),
    },
    response: v.object({ hdgfdvdc: v.string() }),
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

const client = createApiClient(router.endpoints, fetch as any);
// const client = new ApiClient(router.endpoints, fetcher);
const get = client.get("/gagaga", { body: { title: "aa" } });
const post = client.post("/non");
// const azazaz = client.find("/gagaga", "post");
// const azazaz = client.find("/non","post")
