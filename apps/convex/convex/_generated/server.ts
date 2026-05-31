/**
 * Generated server function factories — manually created until Convex deployment is configured.
 * Run `npx convex codegen` to regenerate once a deployment exists.
 */
import {
  actionGeneric,
  httpActionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import type {
  ActionBuilder,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

export const query = queryGeneric as QueryBuilder<DataModel, "public">;
export const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
export const action = actionGeneric as ActionBuilder<DataModel, "public">;
export const httpAction = httpActionGeneric as HttpActionBuilder;

export const internalQuery = internalQueryGeneric as QueryBuilder<
  DataModel,
  "internal"
>;
export const internalMutation = internalMutationGeneric as MutationBuilder<
  DataModel,
  "internal"
>;
export const internalAction = internalActionGeneric as ActionBuilder<
  DataModel,
  "internal"
>;
