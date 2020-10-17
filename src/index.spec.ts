import { makeExecutableSchema } from "@graphql-tools/schema";
import { processGraphQL } from ".";

import "cross-fetch/polyfill";

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
      echo(arg: String!): String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hello world!",
      echo: (_, { arg }: { arg: string }) => arg,
    },
  },
});

const SIMPLE_QUERY = "{ hello }";
const ARGS_QUERY = "query ($arg: String!) { echo(arg: $arg) }";

describe("worker graphql", () => {
  const origin = `http://example.com/`;

  describe("GET", () => {
    it("should respond to get request", async () => {
      const req = new Request(
        `${origin}?query=${encodeURIComponent(SIMPLE_QUERY)}`
      );
      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toEqual({ data: { hello: "Hello world!" } });
    });

    it("should handle variables in url", async () => {
      const url = new URL(origin);
      url.searchParams.set("query", ARGS_QUERY);
      url.searchParams.set("variables", JSON.stringify({ arg: "test" }));

      const req = new Request(url.href);
      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toEqual({ data: { echo: "test" } });
    });
  });

  describe("POST", () => {
    it("should handle JSON", async () => {
      const req = new Request(origin, {
        method: "POST",
        body: JSON.stringify({
          query: ARGS_QUERY,
          variables: { arg: "JSON" },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toEqual({ data: { echo: "JSON" } });
    });

    it("should handle URL form encoded", async () => {
      const req = new Request(origin, {
        method: "POST",
        body: new URLSearchParams({
          query: ARGS_QUERY,
          variables: JSON.stringify({ arg: "URL" }),
        }),
      });

      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toEqual({ data: { echo: "URL" } });
    });

    it("should handle graphql query", async () => {
      const req = new Request(origin, {
        method: "POST",
        body: SIMPLE_QUERY,
        headers: {
          "Content-Type": "application/graphql",
        },
      });

      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toEqual({ data: { hello: "Hello world!" } });
    });

    it("should error on missing content type", async () => {
      const req = new Request(origin, {
        method: "POST",
      });

      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toHaveProperty("errors");
    });

    it("should error on unknown content type", async () => {
      const req = new Request(origin, {
        method: "POST",
        headers: {
          "Content-Type": "foo/bar",
        },
      });

      const res = await processGraphQL(req, { schema });

      expect(await res.json()).toHaveProperty("errors");
    });

    it("should handle content type errors", async () => {
      const req = new Request(origin, {
        method: "POST",
        headers: {
          "Content-Type": "bad-type",
        },
      });

      const res = await processGraphQL(req, { schema });

      expect(res.status).toEqual(400);
    });
  });

  describe("unknown method", () => {
    it("should respond with 405", async () => {
      const req = new Request(origin, { method: "DELETE" });
      const res = await processGraphQL(req, { schema });

      expect(res.status).toEqual(405);
    });
  });

  describe("CORS example", () => {
    const handler = async (req: Request) => {
      if (req.method.toUpperCase() === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Methods": "GET,POST",
            "Access-Control-Allow-Headers":
              req.headers.get("Access-Control-Request-Headers") ||
              "Content-Type",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const res = await processGraphQL(req, { schema });
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    };

    it("should respond to OPTIONS", async () => {
      const req = new Request(origin, { method: "OPTIONS" });
      const res = await handler(req);

      expect(res.status).toEqual(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toEqual("*");
    });

    it("should set origin access control header", async () => {
      const req = new Request(
        `${origin}?query=${encodeURIComponent(SIMPLE_QUERY)}`
      );
      const res = await handler(req);

      expect(res.status).toEqual(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toEqual("*");
    });
  });
});
