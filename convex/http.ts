import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { incrementUsageForChat } from "./chatHttp";
import { verifiedSessionProfile } from "./sessionHttp";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/chat/increment-usage",
  method: "POST",
  handler: incrementUsageForChat,
});

http.route({
  path: "/api/auth/session-profile",
  method: "POST",
  handler: verifiedSessionProfile,
});

export default http;
