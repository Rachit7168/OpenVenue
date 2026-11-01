# Accessibility and security

Checked in both the light and dark themes on the landing page, project list, new-project dialog, guide, and workspace.

## Keyboard

- The first Tab stop is **Skip to content**. It moves past the top bar.
- Buttons, links, and fields show a teal focus ring. Toggle buttons for Plan, 3D, Both, and the camera use the same ring.
- **New project** moves focus into the name field. Tab stays inside the dialog, and Escape closes it and returns focus to the button that opened it.
- **Export** moves focus to the first format and closes with Escape.
- The floor plan can be focused. Arrow keys move the selected furniture by 0.5 m. Shift moves it by 0.1 m. Delete still removes the selection, and Ctrl+Z or Cmd+Z still undoes, when focus is not in a text field.
- Walk mode is unchanged: click the hall to look, WASD to move, and Escape to return to orbit.

## Contrast

Body text on the light pages uses zinc 700 or darker on white, and zinc 300 or lighter on the dark pages. The plan, inspector, and asset row stay on a dark surface in both themes, with zinc 200 or teal 200 for the small labels. The filled teal button keeps white text in the light theme and near-black text in the dark theme.

## Untrusted files

`venue.json` is rejected when it is larger than five million characters, nested deeper than 32 levels, or contains `__proto__`, `constructor`, or `prototype`. What remains is checked against the schema before it replaces a project.

A GLB is rejected when it is larger than 32 MB, is not glTF 2, uses an extension outside the allow-list, or points a buffer or image at anything other than an embedded data URL. Script URLs are refused. The catalogue models shipped with the editor are generated in this repository and do not use those URIs.

## Dependencies

CI runs `pnpm audit --audit-level=high` for the web workspace and `pip-audit` for the API requirements. A high or critical advisory fails the job. `tinypool` is pinned to 2.1.2 or newer because the copy pulled in by Vitest had a critical advisory. Moderate findings in the test runner stay visible in the audit output and do not fail the job.
