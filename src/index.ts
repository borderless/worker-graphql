import { byteLength } from "byte-length";
import { graphql, GraphQLArgs } from "graphql";
import { parse } from "content-type";

/**
 * GraphQL args provided by the HTTP request.
 */
export type RequestArgs = Pick<
  GraphQLArgs,
  "source" | "operationName" | "variableValues"
>;

/**
 * Parse parameters from URL search parameters.
 */
function getArgsFromParams(params: URLSearchParams): RequestArgs {
  const variables = params.get("variables");

  return {
    source: params.get("query") || "",
    operationName: params.get("operationName"),
    variableValues: variables ? JSON.parse(variables) : undefined
  };
}

/**
 * Get variables from URL (e.g. GET request).
 */
export async function getArgsFromURL(req: Request): Promise<RequestArgs> {
  const url = new URL(req.url);
  return getArgsFromParams(url.searchParams);
}

/**
 * Get variables from HTTP body (e.g. POST request).
 */
export async function getArgsFromBody(req: Request): Promise<RequestArgs> {
  const contentType = req.headers.get("Content-Type");
  if (contentType === null) {
    return { source: "" };
  }

  const media = parse(contentType);

  if (media.type === "application/graphql") {
    const body = await req.text();

    return { source: body };
  }

  if (media.type === "application/json") {
    const body = await req.json();

    return {
      source: typeof body.query === "string" ? body.query : "",
      operationName:
        typeof body.operationName === "string" ? body.operationName : null,
      variableValues: body.variables
    };
  }

  if (media.type === "application/x-www-form-urlencoded") {
    const body = await req.text();
    const params = new URLSearchParams(body);
    return getArgsFromParams(params);
  }

  return { source: "" };
}

/**
 * Execute the GraphQL schema.
 */
async function exec(options: GraphQLArgs) {
  const result = await graphql(options);
  const body = JSON.stringify(result);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(byteLength(body))
    }
  });
}

/**
 * Configuration options for handler.
 */
export type Options = Omit<GraphQLArgs, keyof RequestArgs>;

/**
 * Process GraphQL request using the URL (e.g. GET).
 */
export async function processGraphQLFromURL(req: Request, args: Options) {
  return exec({ ...args, ...(await getArgsFromURL(req)) });
}

/**
 * Process GraphQL request using the request body (e.g. POST).
 */
export async function processGraphQLFromBody(req: Request, args: Options) {
  return exec({ ...args, ...(await getArgsFromBody(req)) });
}

/**
 * Create a request handler for GraphQL.
 */
export async function processGraphQL(
  req: Request,
  args: Options
): Promise<Response> {
  const method = req.method.toUpperCase();

  try {
    if (method === "GET") {
      return await processGraphQLFromURL(req, args);
    }

    if (method === "POST") {
      return await processGraphQLFromBody(req, args);
    }
  } catch (err) {
    return new Response(null, { status: 400 });
  }

  return new Response(null, {
    status: 405,
    headers: { Allow: "GET,POST" }
  });
}
