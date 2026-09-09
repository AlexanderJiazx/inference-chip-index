# Data sources

- Repository: https://github.com/mlcommons/inference_results_v6.0
- Commit: `4d3916ac9cf474b679cdfcf492d43a0559418ad1`
- Allowlist: `closed/<submitter>/systems/*.json` and matching `closed/<submitter>/results/**` for workloads `llama3.1-8b` / `llama3_1-8b`, `gpt-oss-120b`, `deepseek-r1` and scenarios Server, Interactive, Offline.
- Official metric: `Completed tokens per second` from `mlperf_log_summary.txt` when `Result is : VALID`.
- Fixture pack (V1): NVIDIA B300-SXM-270GB, AMD Instinct MI355X, Intel Arc Pro B70, plus `data/fixtures/quarantine/mystery-x8.json` (ambiguous x8 count).
