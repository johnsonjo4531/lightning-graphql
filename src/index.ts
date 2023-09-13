import type {
  TypedDocumentNode,
  ResultOf,
  VariablesOf,
} from "@graphql-typed-document-node/core";
import {
  DefinitionNode,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  print,
} from "graphql";

export type { TypedDocumentNode, ResultOf, VariablesOf };

export type GraphQLClientReturn<
  Context extends Record<string, unknown>,
  T extends { [key: string]: unknown }
> = OmitDocumentOnKeys<ToQueryable<Context, GetTypedDocumentNodes<T>>>;

export function GraphQLClient<
  Context extends Record<string, unknown>,
  T extends { [key: string]: unknown } = { [key: string]: unknown }
>({
  source,
  endpoint,
  fetcher = defaultFetcher,
  options,
}: ImportDataSourceOptions<Context, T>): GraphQLClientReturn<Context, T> {
  return Object.fromEntries(
    Object.entries(source)
      .filter((arr: any[]): arr is [string, DefaultTypedDocumentNode] => {
        const value = arr[1];
        return "kind" in value && value.kind === Kind.DOCUMENT;
      })
      .map(([key, query]) => {
        return [
          key.replace(/^./, (x) => x.toLowerCase()).replace(/Document$/, ""),
          query.definitions
            .filter(
              (x): x is OperationDefinitionNode =>
                x.kind === Kind.OPERATION_DEFINITION
            )
            .map((x) =>
              fetcher<Context>({
                endpoint,
                query,
                type: x.operation,
                options,
              })
            )[0] ??
            (() => {
              throw new Error("No such Query");
            }),
        ] as const;
      })
  ) as unknown as GraphQLClientReturn<Context, T>;
}

/** A curried fetcher */
export function defaultFetcher<
  Context extends Record<string, unknown>,
  T extends DefaultTypedDocumentNode = DefaultTypedDocumentNode
>({
  endpoint,
  query,
  options: overridenOptions,
}: {
  endpoint: string;
  query: T;
  type: OperationTypeNode;
  options?: FetcherOptions<Context>;
}) {
  const emptyObj = {};
  return async <Context extends Record<string, unknown>>(
    variables: VariablesOf<T>,
    options?: FetcherOptions<Context>
  ) =>
    fetch(endpoint, {
      ...(overridenOptions?.fetchOptions ?? emptyObj),
      ...(options?.fetchOptions ?? emptyObj),
      method: "POST",
      body: JSON.stringify({
        query: typeof query === "string" ? query : print(query),
        variables,
      }),
      headers: {
        ...(overridenOptions?.fetchOptions?.headers ?? emptyObj),
        ...(options?.fetchOptions?.headers ?? emptyObj),
        "Content-Type": "application/json",
      },
    }).then((x) => x.json());
}

type FetcherOptions<Context extends Record<string, unknown>> = {
  fetchOptions: RequestInit;
  context?: Context;
};

export type Fetcher = <
  Context extends Record<string, unknown>,
  T extends DefaultTypedDocumentNode = DefaultTypedDocumentNode
>({
  endpoint,
  query,
  type,
}: {
  endpoint: string;
  query: T;
  type: OperationTypeNode;
  options?: FetcherOptions<Context>;
}) => Queryable<Context, T>;

export type ImportDataSourceOptions<
  Context extends Record<string, unknown>,
  T extends { [key: string]: unknown }
> = {
  source: T;
  endpoint: string;
  fetcher?: Fetcher;
  options?: FetcherOptions<Context>;
};

type GqlFetchResult<TData = any> = {
  data?: TData;
  errors?: Error[];
};

type DefaultTypedDocumentNode<R = unknown, P = unknown> = TypedDocumentNode<
  R,
  P
>;

type InferTypedDocumentNode<I extends DefaultTypedDocumentNode> =
  I extends TypedDocumentNode<infer J, infer K>
    ? TypedDocumentNode<J, K>
    : never;

type OnlyTypedDocumentNode<I> = I extends TypedDocumentNode<infer J, infer K>
  ? TypedDocumentNode<J, K>
  : never;

type GetTypedDocumentNodes<R extends { [key: string]: unknown }> = {
  [P in keyof R & string]: OnlyTypedDocumentNode<R[P]>;
};

type Queryable<
  Context extends Record<string, unknown>,
  T extends DefaultTypedDocumentNode
> = (
  variables: VariablesOf<T>,
  options?: FetcherOptions<Context>
) => Promise<GqlFetchResult<ResultOf<T>>>;

type OmitDocument<D extends string> = D extends `${infer J & string}Document`
  ? J & string
  : never;

type GetDefinitionNodesOperation<K extends DefinitionNode> = K extends {
  readonly kind: Kind.OPERATION_DEFINITION;
  readonly operation: OperationTypeNode;
}
  ? K extends { readonly operation: infer J }
    ? J
    : never
  : never;

type ToQueryable<
  Context extends Record<string, unknown>,
  T = unknown
> = T extends Record<string, TypedDocumentNode<any, any>>
  ? {
      [P in keyof T & string]: Queryable<Context, InferTypedDocumentNode<T[P]>>;
    }
  : never;

type OmitDocumentOnKeys<T extends Record<string, unknown>> = {
  [K in keyof T & string as Uncapitalize<OmitDocument<K>>]: T[K];
};
