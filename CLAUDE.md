# BMAD Development Automation Rules

This project uses the BMAD Method (Breakthrough Method for Agile AI-Driven Development) with automated workflows.

## Automation Behavior

When executing BMAD workflows, follow these automation rules:

### Auto-Response Rules

1. **Validation Errors**: When `*validate-create-story` returns errors, automatically respond with `all` to fix all errors unless the errors require clarification from the user.

2. **Code Review Fixes**: When `*code-review` identifies issues, automatically fix them unless they involve:
   - Architecture changes
   - Breaking API changes
   - Security concerns
   - Ambiguous requirements

3. **TypeScript Errors**: After any code changes, automatically run type checking and fix errors:
   ```bash
   npx tsc --noEmit
   ```
   
4. **Linting Errors**: After code changes, automatically fix linting issues:
   ```bash
   npm run lint:fix || npx eslint . --fix
   ```

### Workflow Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `bmad story` | `/sm` → `*create-story` → `*validate-create-story` → fix errors |
| `bmad dev` | `/dev` → `*develop-story` → `*code-review` → fix errors → lint/ts fix |
| `bmad cycle` | Full story + dev cycle |
| `bmad fix` | TypeScript + Linting fixes only |

### Story Validation Auto-Fix

When validation fails, automatically apply these fixes:

- **Missing acceptance criteria**: Generate based on story description
- **Missing scope**: Derive from acceptance criteria  
- **Missing technical notes**: Analyze files to touch and add implementation hints
- **Missing tests**: Generate test requirements based on acceptance criteria

### Code Quality Gates

Before completing any development phase, ensure:

1. **TypeScript Clean**: `npx tsc --noEmit` exits with 0
2. **Lint Clean**: `npm run lint` exits with 0 (or no lint script = skip)
3. **Tests Pass**: `npm test` passes (or no test script = skip)

If any gate fails, automatically attempt fixes up to 3 times before asking for help.

## File Conventions

- Stories: `docs/stories/STORY-XXX.md`
- PRD: `docs/prd.md`  
- Architecture: `docs/architecture.md`
- Sprint backlog: `docs/backlog.md`

## Agent Loading

When switching agents, fully adopt the agent's persona and responsibilities:

- `/sm` or `*sm`: Scrum Master - story creation, sprint planning, validation
- `/dev` or `*dev`: Developer - implementation, code quality, testing
- `/pm` or `*pm`: Product Manager - requirements, prioritization
- `/architect` or `*architect`: System Architect - design, technical decisions

## Continuous Flow Mode

When user says "auto" or "continuous", run the full cycle without pausing:

```
Epic → Story → Validate → Fix → Develop → Review → Fix → Lint → TS → Done
```

Only pause for:
- Ambiguous requirements
- Critical errors after 3 fix attempts
- User explicitly says "pause" or "stop"
