/**
 * Generated API type — manually created until Convex deployment is configured.
 * Run `npx convex codegen` to regenerate once a deployment exists.
 */
import type { AnyApi, ApiFromModules } from "convex/server";

// Import function modules to derive API type
import type * as sessions from "../sessions.js";
import type * as http from "../http.js";

/**
 * A utility for referencing Convex functions in your app's API.
 */
declare const fullApi: ApiFromModules<{
  sessions: typeof sessions;
  http: typeof http;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<"public">>;

// Re-export utility types
import type { FilterApi, FunctionReference } from "convex/server";
