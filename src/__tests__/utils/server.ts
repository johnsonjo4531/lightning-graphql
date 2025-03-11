import { createYoga, createSchema, YogaInitialContext } from "graphql-yoga";
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import { AddressInfo, ListenOptions } from "node:net";
import { join } from "node:path";
import { IResolvers } from "@graphql-tools/utils";

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

interface MyContext extends YogaInitialContext {
  req: IncomingMessage;
  res: ServerResponse;
}

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
    // This checks if the cookie is sent back by client after "login".
    isLoggedIn(_, __, context) {
      return context.req.headers.cookie?.includes("session=1") ?? false;
    },
  },
  Mutation: {
    noop: () => true,
    // This just checks if a cookie can be set by the client.
    login(_, __, context) {
      context.res.setHeader("set-cookie", "session=1");
      return true;
    },
  },
} as const satisfies IResolvers<unknown, MyContext>;

export const schema = createSchema<MyContext>({
  typeDefs,
  resolvers,
});
export const testServer = (listen: { port: number }) => {
  const yogaServer = createYoga({
    schema,
  });
  let server: Server | null = null;
  return {
    async listen() {
      server = createServer(yogaServer);
      await new Promise<void>((res) =>
        server?.listen(listen.port, () => {
          return res();
        }),
      );
      const address = server?.address() as Partial<AddressInfo>;
      return {
        url: `http://localhost:${address?.port}/graphql`,
      } as const;
    },
    async unlisten() {
      return new Promise<void>((res, rej) =>
        server?.close((err) => {
          if (err) {
            rej(err);
          } else {
            res();
          }
        }),
      );
    },
  };
};
