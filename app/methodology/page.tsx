export default function MethodologyPage() {
  return (
    <article className="prose">
      <h1>Methodology</h1>
      <p>
        This index publishes official MLPerf Inference v6.0 Closed-division submitted-system results. A ranking is a
        comparison of one exact slice: release, division, workload, scenario, accuracy target, metric, and unit.
      </p>
      <h2>Systems versus chips</h2>
      <p>
        The primary metric is the official submitted system result. A per-accelerator derived value is shown only when
        the source states accelerator count and the metric registry allows derivation. Names such as x8 or NVL72 are
        never used to infer count. Derived values are never the default ranking.
      </p>
      <h2>Scenarios and accuracy</h2>
      <p>
        Server, Interactive, and Offline are incomparable. Workloads llama3.1-8b, gpt-oss-120b, and deepseek-r1 are
        incomparable. Accuracy targets are part of the slice key; this fixture publishes official as-submitted log
        validity only. A requested target with no verified evidence yields no comparable results rather than a mixed
        ranking.
      </p>
      <h2>Validity and quarantine</h2>
      <p>
        Logs must report <code>Result is : VALID</code>. Ambiguous identity, topology, metric, unit, or validity is
        quarantined as review-required and excluded from rankings.
      </p>
      <h2>Provenance</h2>
      <p>
        Every published record carries a stable logical ID, an immutable content-version ID, and an HTTPS source
        reference (repository, commit <code>4d3916ac9cf474b679cdfcf492d43a0559418ad1</code>, path, URL, SHA-256).
      </p>
    </article>
  );
}
