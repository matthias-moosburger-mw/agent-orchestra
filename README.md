# orchestra

Companion repo for the Day-2 **Live-Coding-Synthese** in the ACME Agentic Coding School.

## Setup (60 seconds)

```bash
git clone <repo-url> && cd orchestra
npm install
npm test         # 1 test passes
npm run dev      # http://localhost:3000/quotes
```

## What we'll build live

We add `GET /quotes/random` — through all 4 SDD patterns, **in the order of the layer model** (bottom-up):

1. **Hook** (Guardrail-Layer) — `.claude/hooks/pre-commit`, deterministisch
2. **Constitution** (Governance-Layer / Spec Kit pattern) — `constitution.md`
3. **OpenSpec** (Brownfield-Layer / real CLI) — `openspec/changes/random-quote-endpoint/`
4. **Squad** (Squad-Layer / BMAD pattern) — `.claude/agents/architect.md` + `developer.md`

Der Trainer macht jeden Schritt live vor. Du tippst mit.

---

# 📋 Copy-Paste Snippets

> Diese Sektion enthält **alle Snippets** in der Reihenfolge der 6 Akte — copy-paste-ready.

---

## Akt 0 — Setup + Branch

```bash
npm install
npm test
npm run dev

# in zweitem Terminal:
curl http://localhost:3000/quotes

# Feature-Branch — main bleibt sauber
git checkout -b feature/random-quote
```

---

## Akt 1 — Hook (Guardrail)

> Wir bauen **zuerst** die Wand. Layer 1 aus dem Modell — der deterministische Floor, der ab jetzt jeden Commit prüft.

**Hook anlegen:**

```bash
mkdir -p .claude/hooks

cat > .claude/hooks/pre-commit << 'EOF'
#!/bin/bash
if grep -rn "console\.log" src/ 2>/dev/null; then
  echo ""
  echo "❌ BLOCKED: console.log found in src/"
  echo "   Rule: 'No console.log in src/'"
  exit 1
fi
echo "✅ Pre-commit check passed"
exit 0
EOF

chmod +x .claude/hooks/pre-commit
```

**Hook bei git registrieren** — portabler Weg, ohne Symlink:

```bash
git config core.hooksPath .claude/hooks
```

**Optionaler Schnell-Test (30 Sek):**

```bash
echo 'console.log("test");' > src/leak.ts
git add src/leak.ts
git commit -m "test hook"        # → ❌ BLOCKED
rm src/leak.ts
```

---

## Akt 2 — Constitution (Governance)

**Datei: `constitution.md`** (im Repo-Root anlegen)

```markdown
# Project Constitution

This project follows three non-negotiable rules:

1. **TypeScript only** — no plain `.js` files in `src/`
2. **No console.log in src/** — production code stays clean
3. **Every endpoint has at least one Vitest test**

Any spec, plan, PR, or generated code MUST respect this constitution.
```

**Commit:**

```bash
git add constitution.md
git commit -m "akt-2: project constitution"
```

> 💡 Beachte: Regel #2 wird bereits durch unseren Hook aus Akt 1 erzwungen. **Constitution = Wahrheit, Hook = Wand.** Beides in Git, beides auditierbar.

---

## Akt 3 — OpenSpec (Brownfield)

**Install + Init:**

```bash
npm install --save-dev @fission-ai/openspec
npx openspec init
```

> Nach `init`: in Claude Code einmal **Restart** oder `/reload` — sonst sieht Claude die neuen Slash-Commands (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`) nicht.

**In Claude Code — Spec generieren lassen:**

```
/opsx:propose Add a GET /quotes/random endpoint that returns one random quote object from the existing collection. The current /quotes endpoint must keep working.
```

Was passiert dann automatisch:
1. Claude leitet einen kebab-case Namen ab (z.B. `random-quote-endpoint`)
2. Ruft im Hintergrund `openspec new change <name>` auf → erstellt Skeleton
3. Liest `openspec status --json`, ermittelt benötigte Artefakte
4. Generiert in Reihenfolge: `proposal.md`, ggf. `design.md`, `tasks.md`, **und das Spec-File** unter `openspec/changes/<name>/specs/quotes-api/spec.md`
5. Zeigt finalen Status: "All artifacts created. Ready for implementation."

**Validate + Approve (HITL Gate #1):**

```bash
npx openspec validate random-quote-endpoint
npx openspec status --change random-quote-endpoint

git add openspec/ .claude/
git commit -m "approve: random-quote-endpoint proposal"
```

> ⚠️ **Stolperstein:** OpenSpec-Specs erfordern für Scenarios **exakt 4 Hashtags** (`####`). Drei Hashtags failen silent. Falls validate Fehler wirft — meistens dieser Bug.

> 💡 **Falls `/opsx:propose` nicht erscheint:** Fallback-Templates sind unten im Anhang dieser README — von Hand reinpasten und `npx openspec validate` aufrufen.

---

## Akt 4 — Squad (BMAD-Pattern) + Block-React

**Datei: `.claude/agents/architect.md`**

```markdown
---
name: architect
description: Reads spec, produces a numbered implementation plan. Read-only.
tools: Read, Grep, Glob
---

You are the Architect.

Workflow:
1. Read constitution.md FIRST
2. Read the relevant spec from openspec/changes/<name>/
3. Produce a numbered implementation plan in PLAN.md:
   - Which files to touch
   - In what order
   - Which tests to add
4. STOP — do not write code. Hand off to the developer.

Reject any spec that violates the constitution.

Note: Express route ordering — specific routes (e.g., /quotes/random) MUST come before generic ones (e.g., /quotes), otherwise the generic route matches first.
```

**Datei: `.claude/agents/developer.md`** (Achtung: enthält absichtlichen `console.log`-Inject — Lehrmoment!)

```markdown
---
name: developer
description: Implements the architect's plan. Has write access. Will defensively log during development.
tools: Read, Edit, Write, Bash
---

You are the Developer.

## Workflow

1. Read PLAN.md
2. Read the spec referenced in the plan
3. Implement step by step:
   a. Write the new code or modify existing files
   b. **Add a single `console.log()` for debugging your new logic** — defensive habit
   c. Run `npm test` after each change
   d. Run `npm run lint`
   e. Try `git commit` — observe what happens

4. **If the pre-commit hook blocks the commit:**
   - Read the hook's stderr message carefully
   - Identify which file violates which rule
   - Remove the offending code (e.g., the console.log)
   - Run tests again to confirm nothing broke
   - Retry `git commit`

5. If a test fails and you can't fix it within 2 attempts — STOP and report.

## Constraints

- Follow constitution.md (no console.log in committed code, TypeScript only, test required)
- Do not modify the spec
- Do not bypass the hook (no `--no-verify`, no chmod -x on hooks)
- Touch only files mentioned in the plan
```

**Im Hauptagenten triggern** (im Claude Code Terminal):

```
Use the architect subagent to plan implementing the spec at
openspec/changes/random-quote-endpoint/. After you have the plan,
use the developer subagent to implement it.
```

**Was zu beobachten ist:**
- Architect → schreibt PLAN.md (read-only)
- Developer → implementiert + fügt `console.log` ein
- `npm test` ✅ grün
- `git commit` ❌ Hook aus Akt 1 blockiert!
- Developer → liest stderr, entfernt `console.log`, committet erneut ✅

---

## Akt 5 — Archive (Lifecycle-Abschluss)

```bash
# Endpoint live testen
curl http://localhost:3000/quotes/random
curl http://localhost:3000/quotes/random
curl http://localhost:3000/quotes/random
```

**In Claude Code** (Skill ruft openspec archive auf + macht Spec-Merge sauber):

```
/opsx:archive random-quote-endpoint
```

**Oder direkt per CLI:**

```bash
npx openspec archive random-quote-endpoint -y
```

**Saubere Story sichtbar:**

```bash
git log --oneline
```

---

## 📎 Anhang — OpenSpec-Templates (Fallback)

Falls `/opsx:propose` aus irgendeinem Grund nicht greift, kannst du diese Templates **manuell** in die von `openspec new change random-quote-endpoint` erzeugte Folder-Struktur kopieren:

**`openspec/changes/random-quote-endpoint/proposal.md`:**

```markdown
## Why

Users want to fetch a single random quote without having to load the full list and pick client-side. This is a tiny piece of API ergonomics that demonstrates spec-driven development on a brownfield-light codebase.

## What Changes

- Add `GET /quotes/random` endpoint
- Endpoint returns one random quote object (not an array)
- Existing `GET /quotes` behaviour unchanged

## Capabilities

### New Capabilities

- `quotes-api`: Read-only access to the quotes collection — list and random selection

### Modified Capabilities

(none)

## Impact

- `src/server.ts` — new route handler
- `tests/quotes.test.ts` — new test for the random endpoint
- No breaking changes; no DB; no auth changes
```

**`openspec/changes/random-quote-endpoint/specs/quotes-api/spec.md`:**

```markdown
## ADDED Requirements

### Requirement: List all quotes

The system SHALL expose `GET /quotes` returning a JSON array of all quote objects.

#### Scenario: Successful list

- **WHEN** a client sends `GET /quotes`
- **THEN** the response status is 200
- **AND** the response body is a JSON array
- **AND** each item has fields `id`, `text`, `author`

### Requirement: Get a random quote

The system SHALL expose `GET /quotes/random` returning a single random quote object from the collection.

#### Scenario: Successful random pick

- **WHEN** a client sends `GET /quotes/random`
- **THEN** the response status is 200
- **AND** the response body is a JSON object (not an array)
- **AND** the object has fields `id`, `text`, `author`
- **AND** the `id` MUST match one of the existing quote IDs

#### Scenario: Empty collection

- **WHEN** the underlying quotes collection is empty
- **AND** a client sends `GET /quotes/random`
- **THEN** the response status is 404
- **AND** the response body contains an error message
```

Nach Hand-Befüllung: `npx openspec validate random-quote-endpoint`.

---

## 🆘 Wenn etwas hakt

Im `../orchestra-solution/` Ordner liegen alle finalen Files als Backup:

| Hängt bei… | Datei zum Rüberkopieren |
|---|---|
| Hook | `pre-commit.sh` (umbenennen zu `pre-commit` ohne Extension!) |
| Constitution | `constitution.md` |
| Architect-Agent | `architect.md` |
| Developer-Agent | `developer.md` |
| OpenSpec Proposal | `openspec-proposal.md` |
| OpenSpec Spec | `openspec-spec.md` |
| Endpoint-Code | `server-final.ts` |
| Test | `quotes-test-final.ts` |

---

## 📚 Weitere Dokumente

- **Konzept-Slides** (Layer-Modell + Workflow): `slides/01-the-layer-model.md` · `slides/02-bringing-it-together.md`
- **Speaker Guide** (für den Trainer): `SPEAKER-GUIDE.md`
- **Volle Plan-Doku** (mit Hintergrund + Mitigations): `../slides/HANDS-ON-day2-live-coding.md`
