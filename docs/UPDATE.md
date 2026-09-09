# Update and rollback

## Fixture mode

```bash
bun run dataset:fixture
bun test
```

Promotion is the git commit of `data/generated/dataset.json` and `data/generated/dataset.fixture.sha256`. Rollback is `git checkout HEAD~1 -- data/generated`.

## Full-source mode

Point the importer at a local checkout of commit `4d3916ac9cf474b679cdfcf492d43a0559418ad1` (out of band). `bun run dataset:full-source` currently uses the same checked-in allowlist as fixture until a full tree is provided; it still refuses unverifiable identity.

CI must fail on hash mismatch, missing provenance, unknown units, invalid numbers, duplicate IDs, or uncommitted generated files.
