# LOOP.md

Each Agent OS iteration follows this loop:

1. **Intake** — turn the user's request into one small Factory Brain or dashboard slice.
2. **Inspect** — read the existing vault, repo status, current plan, and relevant runbook before editing.
3. **Contract** — define inputs, outputs, risk level, and measurable verification.
4. **Implement** — change the smallest existing surface; do not create a parallel repo or duplicate data model.
5. **Verify directly** — run the collector, build, tests, or browser checks required by the slice.
6. **Run through the loop engine** — record state and evidence in `state/factory-loop-engine/`.
7. **Log** — write purpose, changes, decisions, verification, and next action to Factory Brain.
8. **Report** — distinguish built, verified, and user-validated state.
9. **Learn** — patch this contract or the relevant runbook when a repeatable failure is discovered.

## Stop Conditions

Stop only for a real blocker, missing critical input, destructive/external action requiring approval, or a verified slice with no implied next slice.

## Failure Recovery

When a worker or collector fails, preserve the evidence, identify the failing contract, fix the contract or implementation, and re-run verification. Do not hide a failed run behind a natural-language summary.
