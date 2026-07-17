import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { StorePage } from "@/components/store/store-chrome";

type UnsubscribeSearch = { email?: string; token?: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): UnsubscribeSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Email preferences | Fawzaan" }] }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { email, token } = Route.useSearch();
  const unsubscribe = useAction(api.marketing.unsubscribe);
  const [state, setState] = useState<"ready" | "saving" | "done" | "error">("ready");
  const [error, setError] = useState("");
  const validLink = Boolean(email && token);

  return (
    <StorePage>
      <main className="mx-auto flex min-h-[55vh] max-w-lg items-center px-[22px] py-16 text-center">
        <div className="w-full border border-black/10 p-7 md:p-10">
          <p className="section-kicker text-black/45">Email preferences</p>
          <h1 className="section-heading mt-3 text-[38px]">
            {state === "done" ? "YOU ARE UNSUBSCRIBED" : "STOP OFFER EMAILS?"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-black/55">
            {state === "done"
              ? "We will no longer send sales or new collection announcements to this address."
              : validLink
                ? `Confirm that you want to stop marketing emails to ${email}.`
                : "This unsubscribe link is incomplete."}
          </p>
          {state === "error" ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          {validLink && state !== "done" ? (
            <button
              type="button"
              disabled={state === "saving"}
              onClick={async () => {
                setState("saving");
                setError("");
                try {
                  await unsubscribe({ email: email!, token: token! });
                  setState("done");
                } catch (caught) {
                  setError(
                    caught instanceof Error ? caught.message : "Could not update preference.",
                  );
                  setState("error");
                }
              }}
              className="mt-7 h-12 w-full bg-black text-[11px] font-bold uppercase text-white disabled:opacity-50"
            >
              {state === "saving" ? "Updating..." : "Unsubscribe"}
            </button>
          ) : null}
          <Link to="/" className="mt-6 block text-[12px] underline underline-offset-4">
            Return to store
          </Link>
        </div>
      </main>
    </StorePage>
  );
}
