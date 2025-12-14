# Validation Report

**Document:** docs/sprint-artifacts/14-2-implement-onix-schema-validation.md
**Checklist:** .bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-13

## Summary

- Overall: 18/22 passed (82%)
- Critical Issues: 3
- Partial Issues: 1

## Section Results

### Source Document Coverage
Pass Rate: 5/5 (100%)

✓ **Epic 14 context extracted** - Lines 82-88 reference FR136, permission requirements
Evidence: "FR Coverage: FR136" (Line 84), "Permission Required: `CREATE_AUTHORS_TITLES`" (Line 88)

✓ **Architecture pattern referenced** - Lines 90-122 cite architecture.md Pattern 4
Evidence: "Per `architecture.md:897-912`, implement two-layer validation" (Line 92)

✓ **Previous story intelligence included** - Lines 590-596 capture Story 14.1 context
Evidence: "From Story 14.1: ONIXMessageBuilder generates well-formed XML..." (Lines 592-596)

✓ **Technical requirements specified** - Complete with FR coverage, permissions, patterns
Evidence: Detailed technical requirements throughout Dev Notes section

✓ **Testing requirements defined** - Lines 598-661 provide comprehensive test examples
Evidence: Unit tests for schema validator, business rules, and actions

### Technical Specification Quality
Pass Rate: 5/7 (71%)

✓ **Architecture pattern followed** - Two-layer validation matches architecture.md
Evidence: validateONIXMessage with schema-first, business-rules-second approach (Lines 111-121)

✓ **Code examples provided** - Complete implementation examples for validator, actions, UI
Evidence: 350+ lines of TypeScript code examples

✓ **File structure defined** - Lines 548-569 specify exact locations
Evidence: `src/modules/onix/validator/` with index.ts, schema-validator.ts, business-rules.ts

✗ **FAIL: Serverless compatibility not addressed**
Impact: **CRITICAL** - libxmljs2 has native bindings that may NOT work on Fly.io serverless Docker deployments. Architecture clearly states "serverless-first" (architecture.md Line 5). Story recommends libxmljs2 as "Recommended" without warning this could cause deployment failures.
Recommendation: Make fast-xml-parser the primary (not fallback) approach since it's pure JavaScript and serverless-compatible.

✗ **FAIL: XML parser dependency missing**
Impact: **CRITICAL** - fast-xml-parser is NOT installed in package.json. Story assumes it exists ("already installed" Line 584) but `grep` found no XML parser in project dependencies.
Recommendation: Add task to install fast-xml-parser: `pnpm add fast-xml-parser`

⚠ **PARTIAL: Modal integration guidance incomplete**
Evidence: Task 6 mentions "Add 'Re-validate' button to preview modal" but no code shows how to modify existing ONIXExportModal component (which currently has no validation props).
Missing: Show exact props to add to ONIXExportModalProps interface and where to insert ValidationResultsDisplay

✓ **Database schema verified** - Correctly notes no schema changes needed
Evidence: "No schema changes needed - existing `onix_exports.status` already supports 'validation_error'" (Line 588)

### Disaster Prevention Checks
Pass Rate: 4/5 (80%)

✓ **No wheel reinvention** - Builds on existing ONIX module structure
Evidence: Extends src/modules/onix/ with new validator/ subdirectory

✓ **Correct file locations** - Follows established module pattern
Evidence: validator/index.ts, validator/schema-validator.ts matches project conventions

✓ **Code reuse identified** - References existing ONIXMessageBuilder, export actions
Evidence: "Update `src/modules/onix/actions.ts`" (Line 344) to integrate validation

✓ **Security considerations addressed** - Permission check included
Evidence: "await requirePermission(CREATE_AUTHORS_TITLES)" (Line 393)

✗ **FAIL: Schema file licensing not addressed**
Impact: **MODERATE** - Task 2 says "Download ONIX 3.1.2 XSD schema from EDItEUR" but doesn't clarify:
- Whether XSD files can be redistributed in repo
- Whether they should be downloaded at build time
- Storage location (public/schemas/ exposes to web)
Recommendation: Add guidance on schema file handling - likely store in `schemas/` (not public) or fetch at runtime

### LLM Developer Optimization
Pass Rate: 4/5 (80%)

✓ **Actionable instructions** - Clear tasks with subtasks, each linked to AC
Evidence: "Task 1: Create validator module structure (AC: 1, 2)" pattern throughout

✓ **Scannable structure** - Good use of headers, code blocks, bullet points
Evidence: Well-organized Dev Notes with distinct sections

✓ **Token efficiency** - Comprehensive but not verbose; code examples are practical
Evidence: ~700 lines total with high information density

✓ **Unambiguous language** - Clear requirements with explicit paths and function names
Evidence: Exact file paths, function signatures, type definitions provided

⚠ **PARTIAL: Missing import statements**
Evidence: ValidationResultsDisplay code (Lines 414-511) references `Button` but doesn't import it
Missing: Add missing imports to code examples for copy-paste reliability

## Failed Items

### 1. Serverless Compatibility (CRITICAL)
**Issue:** libxmljs2 recommended as primary option despite native binding incompatibility with serverless
**Impact:** Could cause deployment failures on Fly.io
**Recommendation:**
- Change recommendation: fast-xml-parser as PRIMARY, libxmljs2 as optional local-only
- Add explicit warning about native bindings
- Update implementation example to use fast-xml-parser by default

### 2. Missing XML Parser Dependency (CRITICAL)
**Issue:** fast-xml-parser not in project dependencies
**Impact:** Story code won't compile without installing dependency
**Recommendation:**
- Add to Task 1 or Task 2: "Install fast-xml-parser: `pnpm add fast-xml-parser`"
- Or add to Dependencies section with install command

### 3. Schema File Handling (MODERATE)
**Issue:** No guidance on XSD file licensing, storage, or retrieval strategy
**Impact:** Could cause legal issues or runtime failures
**Recommendation:**
- Add note about EDItEUR licensing (generally permissive for implementation)
- Store in `schemas/` not `public/schemas/` to avoid web exposure
- Consider alternative: validate structure without full XSD (fast-xml-parser approach)

## Partial Items

### 1. Modal Integration Guidance
**Issue:** Missing concrete code showing ONIXExportModal modification
**Missing:**
```typescript
// Add to ONIXExportModalProps:
interface ONIXExportModalProps {
  // ... existing props
  validationResult?: ValidationResult;
  onRevalidate?: () => void;
}

// Add to modal body after export result display:
{validationResult && (
  <ValidationResultsDisplay
    result={validationResult}
    onRevalidate={onRevalidate}
  />
)}
```

### 2. Missing Imports in Code Examples
**Issue:** Some imports omitted from code blocks
**Missing:**
```typescript
// In validation-results.tsx, add:
import { Button } from "@/components/ui/button";

// In schema-validator.ts, add:
import path from "path";
import fs from "fs/promises";
```

## Recommendations

### 1. Must Fix (Critical)
1. **Change XML validation strategy:** Make fast-xml-parser the primary approach
2. **Add dependency installation:** Add `pnpm add fast-xml-parser` to tasks
3. **Warn about libxmljs2:** Note it's optional and requires local Node.js execution

### 2. Should Improve (Important)
1. **Add modal integration code:** Show exact changes to ONIXExportModal
2. **Add missing imports:** Complete all code examples with full import statements
3. **Clarify schema handling:** Add note about storing XSD files in non-public directory

### 3. Consider (Nice to Have)
1. **Add validation caching:** Note that parsed schema should be cached for performance
2. **Add async loading spinner:** ValidationResultsDisplay could show loading state during validation
3. **Add error count badge:** Show error count in modal header for quick visibility
