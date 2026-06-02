/** Convex Auth + usage debug panel. Bundled locally by scripts/build_frontend.mjs. */
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import { ConvexAuthProvider, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../static/convex_client_api.js";

function ProfilePanel() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const upsert = useMutation(api.users.upsertFromAuth);
  const profile = useQuery(api.users.me);
  const [syncError, setSyncError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const syncProfile = useCallback(async () => {
    setSyncError("");
    setSyncing(true);
    try {
      await upsert({});
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }, [upsert]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && !syncing && profile === null) {
      void syncProfile();
    }
  }, [isAuthenticated, isLoading, profile, syncing, syncProfile]);

  if (isLoading) {
    return <p className="auth-test-status">Checking Convex session...</p>;
  }
  if (!isAuthenticated) {
    return (
      <p className="auth-test-status">
        Sign in above, then this panel will sync and show your profile via{" "}
        <code>users.me</code>.
      </p>
    );
  }
  return (
    <section className="auth-test-profile" aria-live="polite">
      <h2>Profile</h2>
      {syncError ? <p className="missing" role="alert">{syncError}</p> : null}
      <div className="auth-test-actions">
        <button type="button" onClick={() => void syncProfile()} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync profile (upsertFromAuth)"}
        </button>
      </div>
      {profile ? (
        <pre className="auth-test-json">{JSON.stringify(profile, null, 2)}</pre>
      ) : (
        <p className="auth-test-status">Loading profile...</p>
      )}
    </section>
  );
}

function UsagePanel() {
  const { isAuthenticated } = useConvexAuth();
  const usage = useQuery(api.usage.status);
  const increment = useMutation(api.usage.increment);
  const [usageError, setUsageError] = useState("");
  const [incrementing, setIncrementing] = useState(false);

  const onIncrement = useCallback(async () => {
    setUsageError("");
    setIncrementing(true);
    try {
      await increment({});
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIncrementing(false);
    }
  }, [increment]);

  if (!isAuthenticated) {
    return null;
  }
  const atDailyLimit = usage !== undefined && !usage.canSend;
  return (
    <section className="auth-test-profile" aria-live="polite">
      <h2>Usage</h2>
      <p className="auth-test-status">
        Trial limit: 10 messages/day. The 11th <code>usage.increment</code> should
        leave <code>remaining: 0</code> and <code>canSend: false</code>.
      </p>
      {usageError ? <p className="missing" role="alert">{usageError}</p> : null}
      <div className="auth-test-actions">
        <button
          type="button"
          onClick={() => void onIncrement()}
          disabled={incrementing || atDailyLimit}
        >
          {incrementing ? "Incrementing..." : "Test increment (usage.increment)"}
        </button>
      </div>
      {usage === undefined ? (
        <p className="auth-test-status">Loading usage...</p>
      ) : (
        <pre className="auth-test-json">{JSON.stringify(usage, null, 2)}</pre>
      )}
    </section>
  );
}

function mount() {
  const host = document.getElementById("convex-auth-root");
  if (!host?.dataset.convexUrl) {
    return;
  }
  const client = new ConvexReactClient(host.dataset.convexUrl);
  createRoot(host).render(
    <ConvexAuthProvider client={client}>
      <ProfilePanel />
      <UsagePanel />
    </ConvexAuthProvider>,
  );
}

mount();
