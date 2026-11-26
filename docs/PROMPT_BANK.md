# Prompt Bank

A reading-and-copying library inside the app. It never creates, edits, tags, links
or files a finding, and it sends nothing anywhere.

- **Guides (21):** steps you do yourself, no AI needed. Tick rows as you go.
- **Optional AI (10):** prompts to copy into an AI assistant you choose.
- Filter by **section** and **research stage**, or search.
- Type your niche, audience and so on once. They fill into every entry and are
  remembered on the phone. A blank one stays as `{name}`.
- AI prompts have a paste box for your findings. Copying builds the finished prompt.

## Adding content

Add an object to `src/features/promptbank/content/guides.ts` or `aiPrompts.ts`.
No screen code changes. `npm test` checks:

- ids are unique and kebab-case;
- section and stage are valid;
- a guide has items and no prompt, an AI prompt has a prompt and no items;
- the `placeholders` list matches the `{names}` actually used;
- every AI prompt has a `[Paste ... here]` slot, says not to invent facts, and asks for hypotheses to be labelled.

## Notes

- Section ids are the app's own (`market`, `competitor`, `customer`, `product`, `keyword`, `advertising`, `general`).
- Ticks and typed values live in `localStorage`. They are a place-keeper, not a research record.
- Never change an entry `id` once shipped, or its saved ticks are lost.
