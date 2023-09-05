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

export type GraphQLClientReturn<T extends { [key: string]: unknown }> =
  OmitDocumentOnKeys<ToQueryable<GetTypedDocumentNodes<T>>>;

export function GraphQLClient<T extends { [key: string]: unknown }>({
  source,
  endpoint,
  fetcher = defaultFetcher,
}: ImportDataSourceOptions<T>): GraphQLClientReturn<T> {
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
              fetcher({
                endpoint,
                query,
                type: x.operation,
              })
            )[0] ??
            (() => {
              throw new Error("No such Query");
            }),
        ] as const;
      })
  ) as unknown as GraphQLClientReturn<T>;
}

/** A curried fetcher */
export function defaultFetcher<T extends DefaultTypedDocumentNode>({
  endpoint,
  query,
}: {
  endpoint: string;
  query: T;
  type: OperationTypeNode;
}) {
  return async (variables: VariablesOf<T>) =>
    fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        query: typeof query === "string" ? query : print(query),
        variables,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((x) => x.json());
}

export type Fetcher<T extends DefaultTypedDocumentNode> = ({
  endpoint,
  query,
  type,
}: {
  endpoint: string;
  query: T;
  type: OperationTypeNode;
}) => Queryable<T>;

export type ImportDataSourceOptions<T extends { [key: string]: unknown }> = {
  source: T;
  endpoint: string;
  fetcher?: Fetcher<DefaultTypedDocumentNode>;
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

type Queryable<T extends DefaultTypedDocumentNode> = (
  variables: VariablesOf<T>
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

type ToQueryable<T> = T extends Record<string, TypedDocumentNode<any, any>>
  ? {
      [P in keyof T & string]: Queryable<InferTypedDocumentNode<T[P]>>;
    }
  : never;

type OmitDocumentOnKeys<T extends Record<string, unknown>> = {
  [K in keyof T & string as Uncapitalize<OmitDocument<K>>]: T[K];
};
