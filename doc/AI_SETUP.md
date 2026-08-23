# AI workspace setup

This folder is configured for Codex, Claude Code, and Google Antigravity.

## Shared instructions and skills

- `AGENTS.md` is the shared project guidance used by Codex and Antigravity.
- `CLAUDE.md` imports the same guidance for Claude Code.
- `.agents/skills/` is the canonical skill directory for Codex and Antigravity.
- `.claude/skills/` links Claude Code to the same skill folders.
- `skills-lock.json` records the online skill sources and hashes.
- `doc/MOTION_ARCHITECTURE.md` gives every section, transition, property, language, and library a single owner. All three agents must follow it for motion work.

Installed sources:

- GreenSock: official GSAP core, React, ScrollTrigger, timeline, plugin, utility, and performance skills
- Vercel: React/Next.js performance, React View Transitions, and web-interface review skills
- Addy Osmani: accessibility, Core Web Vitals, performance, and web-quality audit skills
- Microsoft: Playwright CLI browser-testing skill
- Project-local: `portfolio-motion`, which applies the approved experience in `doc/moresimple.md`

Update the downloaded skills with:

```powershell
npx skills update -p -y
```

## MCP servers

Each client has its native project configuration:

- Codex: `.codex/config.toml`
- Claude Code: `.mcp.json`
- Antigravity: `.agents/mcp_config.json`

Configured tools:

- Context7 for current library documentation
- Next.js DevTools for a running Next.js app
- Playwright for interaction and visual checks
- Chrome DevTools for browser diagnostics and performance traces

The local MCP packages are version-pinned and run through `npx.cmd` on Windows. On macOS or Linux, change `npx.cmd` to `npx` in the three MCP configuration files.

No API keys are stored in this repository. Context7 works without a key at its lower unauthenticated limit.

## Load and verify

Restart or reopen the project after pulling configuration changes.

- In Codex, use `/skills` and `/mcp`.
- In Claude Code, use `/skills`, `/mcp`, and `/memory`.
- In Antigravity, check Workspace Skills and MCP Servers in the Customizations panel.

The Next.js DevTools server becomes useful after the app exists and its development server is running.
