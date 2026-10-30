# Case authoring and history

A member records either fixed template, reviews imported notes, saves immutable revisions, manages related cases, and archives history.

## Sub-features

- `case-create` saves Product / Delivery and CS / Operations.
- `case-import` drafts from notes, supports cancellation, and requires review before save.
- `case-sources` stores reference metadata without fetching documents.
- `case-revision` preserves old content while showing version summaries.
- `case-index` distinguishes saved content from ready publication.
- `case-links` adds, edits, and removes typed links with explicit archive intent.
- `case-archive` preserves readable history and removes active controls.

## How to get to it

Choose **Record a case** or **Import from notes** in the Hub. `/workspace/knowledge/new` and legacy `/workspace/cases/new` open the Record dialog through `?record=1`. Choose **Edit case** in active detail. Detail `/edit` routes open the Edit dialog through `?edit=1`. Legacy `/workspace/cases/:id` redirects to `/workspace/knowledge/:id`.

Open detail through a hub title, related case, or **Open current case** in source evidence.

## Drive

Require UI login and Doctor. Use unique synthetic titles and record IDs as soon as saved. Real embeddings are required for ready publication; offline saving remains usable.

1. In the Record dialog, fill **Title**, **Problem / objective**, **Context**, and **Approach and reasoning**. Add optional constraints, lessons, and domain fields.
2. Use combobox **Template** and option **Product / Delivery**, or **CS / Operations**. Save one of each. Use human option labels rather than `selectOption`. Changing a template with populated domain fields requires **Switch and clear**; core fields remain.
3. Choose **Outcome**. Known outcomes require **Observed outcome**. Add **Source 1 label** and **Source 1 URL** through **Add source**. Observe that source URLs are not fetched automatically.
4. Choose **Save case**. Read `/api/cases/:id` after navigation. Without AI require a saved failed revision, null publication, **Failed**, and **Couldn't prepare this case for questions.** With embeddings require ready indexing, matching publication, and **Available**.
5. Edit the approach, save, reload, and require a new latest revision. Compare old content through the authorized API. **Version history** shows numbered versions and change summaries, not old section text.
6. For failed indexing, choose **Try again**. Require the returned **Ready for questions.** or **Still couldn't prepare this case. Try again.** and confirm actual state through the API. A failed edit to a previously ready case must preserve its earlier published revision.
7. With two active fixtures, choose **Add case**, select **Case** and **Relation**, fill **Reason**, and submit **Add case** in the dialog. Require the related title and persisted link. Hover or focus its row to use **Edit link to TITLE**. Change relation with **Save changes**, then verify the inverse label from the other case. **Supersedes** reads **Superseded by** at the target. Remove through **Remove link to TITLE**, then **Remove link**.
8. When adding a Supersedes link, check **Also archive the selected case** only for an owned target intended for archival. Editing an existing link does not offer this checkbox. Removing Supersedes does not unarchive its target.
9. Choose **Archive**, then confirm **Archive case**. Require **Archived**, readable content after reload, no Edit or retry controls, and hub visibility through **Include archived**.

## Draft from notes

Open **Import from notes**. Fill **Paste your notes**. **Choose documents** lists filenames beside **Coming soon. Files are not read or uploaded.** File contents stay in the browser.

Choose **Draft case**. During the real request, **Stop drafting** restores notes. Without model access, require **AI drafting is unavailable.** and retained notes. With access, require **Review the draft**, editable fields, and the drafting summary. Notes without a stated result must retain Unknown outcome and empty observed outcome. Nothing is saved until **Save case**. Confirm saved content and publication through the normal detail API.

## Gotchas

Basic seed creates no ready corpus. Never fabricate vectors or model output. Template switching clears domain fields after confirmation. Archived cases have no edit, retry, or link controls. Exercise those first.

The offline proof covers both templates, sources, immutable edits, failed retry, link mutations, unavailable import, and archive. The opt-in proof covers real import and publication. Publication preservation on a failed update, import cancellation, and add-with-archive require additional drives.

There is no delete or unarchive UI. Archive only owned synthetic cases and report retained history.
