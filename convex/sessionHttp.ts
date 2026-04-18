import { httpAction } from "./_generated/server";

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Resolve the Flask session profile from a verified Convex Auth bearer token. */
export const verifiedSessionProfile = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return jsonResponse({ ok: false, error: "Not authenticated" }, 401);
  }

  return jsonResponse(
    {
      ok: true,
      user: {
        id: identity.tokenIdentifier,
        googleSub: identity.subject,
        email: identity.email,
        name: identity.name ?? identity.email ?? "Google user",
        picture: identity.pictureUrl,
      },
    },
    200,
  );
});
