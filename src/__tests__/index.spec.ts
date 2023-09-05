import { testServer } from "./utils/server";
import { GraphQLClient } from "../index";
import { BooksDocument, AuthorsDocument } from "../__generated__/client-types";

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

afterAll(async () => {
  await server.unlisten();
});
