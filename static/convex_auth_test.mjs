/**
 * Phase 3 — Convex Auth test panel (React via esm.sh, no app bundle).
 */
import React, { useCallback, useEffect, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { ConvexReactClient, useMutation, useQuery } from "https://esm.sh/convex@1.39.1/react?deps=react@18.3.1";
import {
  ConvexAuthProvider,
  useConvexAuth,
} from "https://esm.sh/@convex-dev/auth@0.0.92/react?deps=react@18.3.1,convex@1.39.1";
import { api } from "./convex_client_api.js";

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
    if (!isAuthenticated || isLoading || syncing) {
      return;
    }
    if (profile === undefined) {
      return;
    }
    if (profile !== null) {
      return;
    }
    void syncProfile();
  }, [isAuthenticated, isLoading, profile, syncing, syncProfile]);

  if (isLoading) {
    return <p className="auth-test-status">Checking Convex session…</p>;
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
      <h2>Profile (Phase 3)</h2>
      {syncError ? <p className="missing" role="alert">{syncError}</p> : null}
      <div className="auth-test-actions">
        <button
          type="button"
          onClick={() => void syncProfile()}
          disabled={syncing}
          aria-busy={syncing}
        >
          {syncing ? "Syncing…" : "Sync profile (upsertFromAuth)"}
        </button>
      </div>
      {profile ? (
        <pre className="auth-test-json">{JSON.stringify(profile, null, 2)}</pre>
      ) : (
        <p className="auth-test-status">Loading profile…</p>
      )}
    </section>
  );
}

function mount() {
  const host = document.getElementById("convex-auth-root");
  if (!host) {
    return;
  }
  const convexUrl = host.dataset.convexUrl;
  if (!convexUrl) {
    return;
  }
  const client = new ConvexReactClient(convexUrl);
  createRoot(host).render(
    React.createElement(
      ConvexAuthProvider,
      { client },
      React.createElement(ProfilePanel),
    ),
  );
}

mount();
