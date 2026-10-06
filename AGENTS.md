# Agent instructions

## Keep the landing page in sync

`docs/index.html` is the public site (https://amims71.github.io/claude-plugins/), published from `main` by GitHub Pages. It is not generated from the plugins, so it goes stale unless you update it by hand.

Whenever a change adds, removes, renames or changes a plugin, its version, its hooks, what it does, or what it needs, update `docs/index.html` in the same PR. Check every place the page states something about the plugins:

- `<meta name="description">` in the head
- Hero: the plugin count in the lede and `facts`, and the terminal demo (install lines, versions, hooks)
- `#lifecycle`: the heading's event and plugin counts, and each event's description and `ev-by` links
- `#plugins`: the heading, the intro paragraph's claims (runtime, platforms, dependencies), and each plugin's card (version, tagline, body, hook chips, install command, docs link)
- `#install`: any claim about setup, such as "no settings.json to edit"

Then open the page in a browser and look at it before you call it done.

Also keep `README.md` (the plugin table) and `.claude-plugin/marketplace.json` in sync with the same change.
