import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import type { HomepageData, HomepageEditorState } from "@/features/homepage/types";

export async function getHomepageEditorState(): Promise<HomepageEditorState> {
  return (await convex.query(api.homepage.getEditorState, {})) as HomepageEditorState;
}

export async function saveHomepageDraft(data: HomepageData, baseRevision: number) {
  return await convex.mutation(api.homepage.saveDraft, {
    data,
    base_revision: baseRevision,
  });
}

export async function publishHomepage(data: HomepageData, baseRevision: number, summary?: string) {
  return await convex.mutation(api.homepage.publish, {
    data,
    base_revision: baseRevision,
    summary: summary?.trim() || undefined,
  });
}

export async function restoreHomepageVersion(id: string) {
  return await convex.mutation(api.homepage.restoreVersion, {
    id: id as Id<"homepage_versions">,
  });
}

export async function discardHomepageDraft() {
  return await convex.mutation(api.homepage.discardDraft, {});
}
