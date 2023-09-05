# Lightning GraphQL

![Lightning GraphQL logo](./assets/lightning-graphql.png)

Lite Cache-less GraphQL client with excellent type-support for Node and Browsers.
This library's default datafetcher only works with queries and mutations and not subscriptions, so
if you want that still use the fetcher option and provide your own datafetcher (providing your own
datafetcher can also fix other things e.g. the queries being cache-less)

**Why?**: I couldn't find a simple way to go from writing graphql queries on my server that wouldn't be cached between requests, and I also wanted a library that didn't compromise on type-safety and great developer experience (DX).

## Client Examples

Given a **queries.graphql** like so that has been generated to a file called `./__generated__/client-types.ts`:

```ts
query Books {
  books {
    title
    author
  }
}

query Authors {
  authors
}

query BookByTitle($title: String!) {
  findBookByTitle(title: $title) {
    title
    author
  }
}

mutation Noop {
  noop
}
```

We can write our client like so:

**client.ts**
```ts
import {GraphQLClient} from "lightning-graphql"
const client = GraphQLClient({
  source: await import("./__generated__/client-types"),
  endpoint: serverURL,
});

// All these methods are camelcased named versions of queries and mutations written in the above queries.ts file.
// The methods below also come with great type-hints and safety.
const book = await client.bookByTitle({
  title: "The Great Gatsby",
}); // get Book by title
const books = await client.books({}); // get all Books 
const truthy = await client.noop({}); // runs the Noop mutation
const authors = await client.authors({}); // get all Authors 
```

If you notice above our client is generated and populated with all information from the Query file.
This is possible because of GraphQL Codegen's TypedDocumentNodes.

## Minimal Example with Server and Full Type Support


### Server Setup

First we get our **./src/schema.graphql** file:


```gql
type Book {
  title: String
  author: String
}

type Query {
  books: [Book]
  authors: [String]
  findBookByTitle(title: String!): Book
}

type Mutation {
  noop: Boolean!
}
```


Then we write a somewhat large **./src/server.js** file:


```ts
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "node:fs";
import { ListenOptions } from "node:net";
import { join } from "node:path";

const books = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  },
  {
    title: "Where the Sidewalk Ends",
    author: "Shel Silverstein",
  },
];

const typeDefs = readFileSync(join(__dirname, "schema.graphql"), {
  encoding: "utf-8",
});

export const resolvers = {
  Query: {
    books: () => books,
    authors: () => books.map((x) => x.author),
    findBookByTitle(_root: any, { title }: { title: string }) {
      return books.find((x) => x.title === title);
    },
  },
  Mutation: {
    noop: () => true,
  },
};

export const testServer = (listen: ListenOptions) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  return {
    async listen() {
      return startStandaloneServer(server, {
        listen,
      });
    },
    async unlisten() {
      await server.stop();
    },
  };
};
```

### Client Setup

With the server finished we then write our query in **./src/queries.ts**

```gql
query Books {
  books {
    title
    author
  }
}

query Authors {
  authors
}

query BookByTitle($title: String!) {
  findBookByTitle(title: $title) {
    title
    author
  }
}

mutation Noop {
  noop
}
```

Then we generate types for the Schema and Query:

By first installing packages for codegen:


```bash
npm i @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node
```

Then setting up the following **./codegen.yml**:

```yml
# You provide a schema and documents
schema: "./src/schema.graphql"
documents: "./src/queries.graphql"
generates:
  # These line can change to where you want the types to go.
  ./src/__generated__/client-types.ts:
    # All three of these are required 
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typed-document-node"
```

The following package.json script called `generate`:

```json5
{
  // ...
  "scripts": {
    // ...
    "generate": "graphql-codegen --config codegen.yml"
  }
  // ...
}
```

Then generate the client types with:

```bash
npm run generate
```

Then we can finally write our Queries in a **./src/client.ts** file where we get all the type-safe goodness!

```ts
import {GraphQLClient} from "lightning-graphql"
const client = GraphQLClient({
  source: await import("./__generated__/client-types"),
  endpoint: serverURL,
});

// All these methods are camelcased named versions of queries and mutations written in the above queries.ts file.
const book = await client.bookByTitle({
  title: "The Great Gatsby",
}); // get Book by title
const books = await client.books({}); // get all Books 
const truthy = await client.noop({}); // runs the Noop mutation
const authors = await client.authors({}); // get all Authors 
```


## Supplying your own fetcher instead of using the default fetch.

```ts
import {GraphQLClient} from "lightning-graphql"
const client = GraphQLClient({
  source: await import("./__generated__/client-types"),
  endpoint: serverURL,
  fetcher ({endpoint, query, type}) {
    return async (variables) => {
      // Go Fetch Your Data!
    }
  }
});
```
