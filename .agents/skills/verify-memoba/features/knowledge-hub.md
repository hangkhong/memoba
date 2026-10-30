# Knowledge Hub

A member searches and sorts cases, filters by template and outcome, and opens active or archived history.

## Sub-features

- `hub-search` matches title and problem text.
- `hub-filters` combines template and outcome filters and displays the result count.
- `hub-sort` sorts by Case or Updated.
- `hub-archive` reveals archived history.
- `hub-detail` opens case content, status, and version summaries.

## How to get to it

Choose **Knowledge Hub**, open `/workspace/knowledge`, or use **Back to Knowledge Hub** from detail. On mobile, open **Toggle Sidebar** first. Choose a title or click its row to open detail. **Record a case** and **Import from notes** open dialogs described in [case authoring](cases.md).

## Drive

Require UI login and Doctor. Create uniquely labelled fixtures through the case recipe when needed. Basic seed creates no cases.

1. Require heading **Knowledge Hub** and region **Cases**.
2. Fill **Search cases** with a fixture title, then distinctive problem text. Require the matching title and exclude unrelated results.
3. Click combobox **Template**, then option **Product / Delivery**. Click combobox **Outcome**, then **Unknown**. Require matching rows and count status. Repeat **CS / Operations** with its fixture.
4. Search a nonexistent string and require **No cases match these filters.** Reset the comboboxes to **All templates** and **All outcomes**, then clear search.
5. Click button **Case** and inspect its column header's `aria-sort`. Click again to reverse. Repeat **Updated**. Default order is updated descending.
6. Search an archived fixture. Require no result until checkbox **Include archived** is checked. Open it and require readable content after reload, archived lifecycle from `/api/cases/:id`, and no edit controls.
7. Return with **Back to Knowledge Hub**. Open and cancel each authoring dialog.

Capture the table and ARIA state after filters and sorting. The offline maintenance proof covers these paths with cases it creates.

## Gotchas

The comboboxes are custom controls. Use click plus `getByRole('option')`, not `selectOption`. Filters combine; reset them before diagnosing a missing result. Search matches title and problem, not semantic retrieval or every section. A visible case with failed indexing is not published evidence.

Use `getByRole('checkbox', { name: 'Include archived', exact: true })`. The custom checkbox also has a hidden labelled input, so `getByLabel` is ambiguous.
