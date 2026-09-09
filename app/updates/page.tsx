import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { dataset } from "@/lib/dataset";

export default async function UpdatesPage() {
  const changelog = await readFile(join(process.cwd(), "data/generated/changelog.md"), "utf8");
  return (
    <article className="prose">
      <h1>Dataset updates</h1>
      <p>
        Manifest <code>{dataset.datasetVersion}</code> from commit <code>{dataset.sourceCommit}</code>. Mode{" "}
        {dataset.mode}. Quarantined records: {dataset.counts.quarantined}.
      </p>
      <h2>Coverage</h2>
      <pre>{JSON.stringify(dataset.coverage, null, 2)}</pre>
      <h2>Changelog</h2>
      <pre>{changelog}</pre>
      <h2>Quarantine (review-required, excluded from rankings)</h2>
      <pre>{JSON.stringify(dataset.quarantine, null, 2)}</pre>
    </article>
  );
}
