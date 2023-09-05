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
