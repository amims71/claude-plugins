# claude-plugins

Personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace.

Add this marketplace to your Claude Code once, then install any plugin from it. The marketplace handle is **`amim`**.

## Add the marketplace

```
/plugin marketplace add amims71/claude-plugins
```

(`gh` auth or a public-repo clone is enough — no token needed for installing public plugins.)

## Available plugins

| Plugin | Slash install | What it does |
| --- | --- | --- |
| [`comment-rule`](./plugins/comment-rule) | `/plugin install comment-rule@amim` | Keeps Claude's code-commenting discipline consistent across long sessions. Injects a one-line nudge into every prompt + ships a skill containing the actual rule. |
| [`claude-ntfy`](./plugins/claude-ntfy) | `/plugin install claude-ntfy@amim` | Pushes Claude Code updates to your phone via ntfy — the turn-end message (PR link / decision / error), not a static "your turn". Auto-generates a private topic on first run with subscribe instructions. |

## Layout

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json        # registers all plugins in this repo
├── plugins/
│   └── comment-rule/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/
│       │   ├── hooks.json
│       │   └── prepend-comment-rule.sh
│       ├── skills/comment-rule/SKILL.md
│       └── README.md
└── README.md
```

## Adding a new plugin

1. Create `plugins/<plugin-name>/` with a `.claude-plugin/plugin.json` manifest.
2. Add its `hooks/`, `skills/`, `commands/`, or `agents/` directories as needed.
3. Append an entry to `.claude-plugin/marketplace.json`:

```json
{
  "name": "<plugin-name>",
  "description": "...",
  "source": "./plugins/<plugin-name>",
  "category": "workflow"
}
```

4. Bump `version` in the plugin manifest, commit, push. Users re-sync with `/plugin marketplace update amim`.
