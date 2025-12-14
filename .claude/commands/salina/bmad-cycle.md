# BMAD Automated Development Cycle

Execute the full BMAD workflow automatically for each epic.

## Your Behavior for This Session

When I provide an epic/feature, you will:

1. **Story Phase**
   - Run `/sm` to load Scrum Master
   - Run `*create-story` 
   - Run `*validate-create-story`
   - If validation shows errors, respond with `all` to fix them
   - Repeat validation until it passes

2. **Development Phase**
   - Run `/dev` to load Developer
   - Run `*develop-story`
   - Run `*code-review`
   - Fix any issues identified
   - Run `npx tsc --noEmit` and fix any TypeScript errors
   - Run `npm run lint` or `npx eslint . --fix` and fix any linting errors

3. **Completion**
   - Confirm all checks pass
   - Summarize what was implemented

## Auto-Response Rules

- When `*validate-create-story` returns errors → automatically respond "all"
- When code review has issues → automatically fix them
- When TS/lint errors exist → automatically fix them
- Only pause if requirements are unclear

---

**What epic or feature should I implement?**
```

**3. Then in Claude Code, run:**
```
/bmad-cycle
