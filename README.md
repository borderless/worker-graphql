# Worker GraphQL

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> GraphQL server for worker environments (e.g. Cloudflare Workers).

GraphQL on Workers was inspired by [this blog post](https://blog.cloudflare.com/building-a-graphql-server-on-the-edge-with-cloudflare-workers/), but using Apollo Server has a [massive bundle size](https://github.com/apollographql/apollo-server/issues/1572) or can't bundle due to dependency on `graphql-upload` (a node.js dependency). Using `worker-graphql` resulted in a build of < 50KB.

## Installation

```
npm install @borderlesslabs/worker-graphql --save
```

## Usage

```ts
import { processGraphQL } from "@borderlesslabs/worker-graphql";
import { makeExecutableSchema } from "graphql-tools";

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hello world!"
    }
  }
});

// Wrap `processGraphQL` with CORS support.
const handler = async (req: Request) => {
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET,POST",
        "Access-Control-Allow-Headers":
          req.headers.get("Access-Control-Request-Headers") || "Content-Type",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const res = await processGraphQL(req, { schema });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
};

addEventListener("fetch", event => {
  event.respondWith(handler(event.request));
});
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/borderlesslabs/worker-graphql.svg?style=flat
[npm-url]: https://npmjs.org/package/borderlesslabs/worker-graphql
[downloads-image]: https://img.shields.io/npm/dm/borderlesslabs/worker-graphql.svg?style=flat
[downloads-url]: https://npmjs.org/package/borderlesslabs/worker-graphql
[travis-image]: https://img.shields.io/travis/borderlesslabs/worker-graphql.svg?style=flat
[travis-url]: https://travis-ci.org/borderlesslabs/worker-graphql
[coveralls-image]: https://img.shields.io/coveralls/borderlesslabs/worker-graphql.svg?style=flat
[coveralls-url]: https://coveralls.io/r/borderlesslabs/worker-graphql?branch=master
