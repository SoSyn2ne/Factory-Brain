# Factory Brain Restart Workbench

## Product decision

Factory Brain is the user's persistent project workbench. The home screen must help the user re-enter work, choose what to inspect, and then explore relationships.

## First slice

1. Add a **Restart Desk** before Portfolio View.
2. Derive optional restart records from each private `10-projects/*/INDEX.md`:
   - last decision
   - run command / execution method
   - unresolved issue or blocker
   - next action
3. Keep the web surface read-only. Link each record back to the project page and to its Obsidian note for editing.
4. Add filters for all projects, projects with a next action, and projects whose restart record needs filling.
5. Extend the new-project template so future projects start with the four records.

## Source-of-truth boundary

- Obsidian Vault remains the editable source.
- The local snapshot remains a build-time projection.
- Public builds never read the private snapshot.
- Missing fields render as missing; no summary is invented.

## Follow-up slices

- Add a project-specific activity/review timeline sourced from session logs.
- Add a small “update checklist” flow that opens the INDEX in Obsidian without pretending the web UI wrote it.
- Add a daily re-entry queue only after the INDEX records are populated consistently.
