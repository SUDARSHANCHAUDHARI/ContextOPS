import { Hono } from "hono";
import { handle } from "hono/vercel";
import { ContextOpsStore } from "@contextops/storage";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.get("/health", (context) =>
  context.json({
    ok: true,
    mode: "local-first",
    telemetry: false,
  }),
);

app.get("/summary", (context) => {
  const store = new ContextOpsStore();
  const summary = store.summary({
    provider: context.req.query("provider"),
    from: context.req.query("from"),
    to: context.req.query("to"),
  });
  store.close();
  return context.json(summary);
});

app.get("/report", (context) => {
  const store = new ContextOpsStore();
  const report = store.buildReport({
    provider: context.req.query("provider"),
    from: context.req.query("from"),
    to: context.req.query("to"),
  });
  store.close();
  return context.json(report);
});

app.get("/sessions", (context) => {
  const store = new ContextOpsStore();
  const sessions = store.listSessions(50);
  store.close();
  return context.json({ sessions });
});

app.get("/sessions/:id", (context) => {
  const store = new ContextOpsStore();
  const session = store.getSession(context.req.param("id"));
  store.close();
  if (!session) return context.json({ error: "session_not_found" }, 404);
  return context.json({ session });
});

app.get("/waste", (context) => {
  const store = new ContextOpsStore();
  const waste = store.listWaste(100);
  store.close();
  return context.json({ waste });
});

export const GET = handle(app);
