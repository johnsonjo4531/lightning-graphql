import { schema, testServer } from "./utils/server";
import {
  CookieStore,
  DefaultFetcher,
  defaultFetcher,
  DefaultFetchReturnType,
  GraphQLClient,
  GraphQLClientReturn,
} from "../index";
import { BooksDocument, AuthorsDocument } from "../__generated__/client-types";
import { execute } from "graphql";

let serverURL = "";
const server = testServer({ port: 9970 });

beforeAll(async () => {
  ({ url: serverURL } = await server.listen());
});

it("should work without import", async () => {
  const datasource = GraphQLClient({
    source: { BooksDocument, AuthorsDocument },
    endpoint: serverURL,
  });

  const books = await datasource.books({});

  expect(books.errors).toBeUndefined();
  expect(books.data?.books).toBeTruthy();
});

it("should do Books query", async () => {
  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
  });

  const books = await datasource.books({});

  expect(books.errors).toBeUndefined();
  expect(books.data?.books).toBeTruthy();
});

it("should do Authors Query", async () => {
  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
  });

  const authors = await datasource.authors({});

  expect(authors.data?.authors).toHaveLength(2);
});

it("should do Noop Mutation", async () => {
  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
  });

  const authors = await datasource.noop({});

  expect(authors.data?.noop).toBeTruthy();
});

it("should work with variables in query", async () => {
  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
  });

  const authors = await datasource.bookByTitle({
    title: "The Great Gatsby",
  });

  expect(authors.data?.findBookByTitle?.title).toEqual("The Great Gatsby");
});

it("should work with new fetcher", async () => {
  const title = "__title__";

  const source = await import("../__generated__/client-types");
  const datasource = GraphQLClient({
    source,
    endpoint: serverURL,
    fetcher(...args) {
      return async (...args2) => {
        return execute({
          schema,
          document: args[0].query,
          variableValues: args2[0] as Record<string, unknown>,
        }) as DefaultFetchReturnType<typeof source>;
      };
    },
  });

  const authors = await datasource.bookByTitle({
    title: "The Great Gatsby",
  });

  expect(authors?.data?.findBookByTitle).toEqual({
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  });
});

it("should work with defaultFetcher used as new fetcher", async () => {
  const source = await import("../__generated__/client-types");

  const client = GraphQLClient({
    source,
    endpoint: serverURL,
    fetcher: (...args) => {
      return async (...args2) => {
        return (
          defaultFetcher as DefaultFetcher<
            Record<string, unknown>,
            typeof source
          >
        )(...args)(...args2);
      };
    },
    options: {
      fetchOptions: {
        credentials: "include",
      },
    },
  });

  const authors = await client.bookByTitle({
    title: "The Great Gatsby",
  });

  expect(authors?.data?.findBookByTitle).toEqual({
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  });
});

it("should handle cookies with CookieStore at client level", async () => {
  const cookieStore = new CookieStore();

  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
    options: {
      cookieStore,
      fetchOptions: {
        credentials: "include",
      },
    },
  });

  const loggedIn = await datasource.login({});
  const isLoggedIn = await datasource.isLoggedIn({});

  expect(loggedIn?.data?.login).toEqual(true);
  expect(isLoggedIn?.data?.isLoggedIn).toEqual(true);
});

it("should handle cookies with CookieStore at query level", async () => {
  const datasource = GraphQLClient({
    source: await import("../__generated__/client-types"),
    endpoint: serverURL,
    options: {
      fetchOptions: {
        credentials: "include",
      },
    },
  });

  const cookieStore = new CookieStore();

  const loggedIn = await datasource.login(
    {},
    {
      cookieStore,
    },
  );
  const isLoggedIn = await datasource.isLoggedIn(
    {},
    {
      cookieStore,
    },
  );
  const loggedInCheckNoCookie = await datasource.isLoggedIn({});

  expect(loggedIn?.data?.login).toEqual(true);
  expect(isLoggedIn?.data?.isLoggedIn).toEqual(true);
  expect(loggedInCheckNoCookie?.data?.isLoggedIn).toEqual(false);
});

afterAll(async () => {
  await server.unlisten();
});
