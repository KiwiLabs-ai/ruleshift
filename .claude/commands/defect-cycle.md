---
description: "Automated defect triage, diagnosis, fix, and verification workflow. Reads defects from Airtable, fixes code, commits, runs tests, and updates tracker."
---

# Defect Cycle

Automated defect triage → diagnosis → fix → verification workflow for RuleShift.
Reads defects from Airtable, fixes code, runs tests, and updates both Airtable and git.

## Usage

```
/defect-cycle              # Full loop: triage → fix → verify
/defect-cycle triage       # Phase 1 only — read new defects, classify, set test type
/defect-cycle fix          # Phase 2 only — diagnose and fix "In Analysis" defects
/defect-cycle verify       # Phase 3 only — run tests, generate manual checklist
/defect-cycle status       # Summary — counts by status, next actions
```

## Airtable Reference

### Base & Tables

| Name | ID |
|------|----|
| Base: Defect Tracker | `appbyB1twnzgbzAjO` |
| Table: Defects | `tblBKC74sPz3Dy5d6` |
| Table: Manual Test Cases | `tblqkrLrdZv6E1rTU` |
| Table: Features | `tblpNVx908xCK0QC4` |

### Defects Table — Field IDs

| Field | ID | Type | Owner |
|-------|----|------|-------|
| Title | `fldpDNoFlyIWgaexW` | singleLineText | Claude |
| Description | `fldtGcyDV1VoualC1` | multilineText | Claude |
| Severity | `fldMz1mkP24HvRa4l` | singleSelect | Both |
| Status | `fldMnpyFzQkJrD18K` | singleSelect | Both |
| Reproduction Steps | `fldaix1G4V1rh1Y7C` | multilineText | Claude |
| Affected Feature | `fldqrpc636FYQoPyR` | multipleRecordLinks | Claude |
| Reported By | `fld3WzgmUHzW0WyZZ` | singleLineText | Claude |
| Reported Date | `fldp72sr3tPb36joz` | date | Claude |
| Resolution Date | `fldaiZsYGPCX8qgVR` | date | Claude |
| Resolution Notes | `fldWq4TyT1u2ivuMC` | multilineText | Claude |
| Screenshots | `fldLEg3NCtsAQmESU` | multipleAttachments | Human |
| Related Test Case | `fldOiFaYyLftdrEEw` | multipleRecordLinks | Claude |
| Fix Commit | `fld7BXDcm2jlsKSoS` | singleLineText | Claude |
| Test Type | `fld4S8PZct40aQ5fv` | singleSelect | Claude |
| Root Cause | `fld7SHMeLrhLsNRgM` | multilineText | Claude |

### Defects — Select Option Values

**Severity:** Critical, High, Medium, Low

**Status lifecycle:** New → In Analysis → In Progress → Fixed → Verified → Closed
Additional: Won't Fix, Deferred

**Test Type:** Automated, Manual, Both

### Manual Test Cases Table — Key Field IDs

| Field | ID |
|-------|----|
| Name | `fldETjgqthmhUpFmj` |
| Feature Area | `fldNfm9sJtUniNJye` |
| Priority | `fldhNquAxzTnrUmbk` |
| Result | `fldTUeUSo6IeGsWh2` |
| Steps | `fldZgjy2kRzyhtWA6` |
| Expected Result | `fldFZSpj3KgO67vYv` |
| Preconditions | `fldVY8rImC8YLOiTw` |
| Related Commit | `fld03XNcb1G0b0vi7` |
| Related Finding | `fldniZwj0svceKzJF` |
| Last Run | `fldW2k6IYtnui6HeO` |
| Notes | `fldM55GiWf7PBnykN` |
| Related Defects (reverse link) | `fldCizeFtZRqILfYN` |

---

## Phase 1: Triage

**Goal:** Read all new defects, classify them, prepare for fixing.

### Steps

1. **Fetch defects** — Use `list_records_for_table` on `tblBKC74sPz3Dy5d6` filtered to Status = "New". Sort by Severity (Critical → High → Medium → Low).

2. **For each defect, determine Test Type:**
   - Read the Description and Reproduction Steps
   - If the defect is purely in backend code (API routes, DB queries, serverless functions, cron jobs, webhooks) → **Automated**
   - If the defect requires clicking buttons, seeing UI feedback, visual layout checks → **Manual**
   - If it needs a code fix AND visual confirmation → **Both**

3. **If a Related Test Case is linked**, read the test case's Steps and Expected Result for additional context.

4. **Update each defect in Airtable:**
   - Set `Test Type` to the determined value
   - Set `Status` → "In Analysis"

5. **Print triage summary:**
   ```
   TRIAGE COMPLETE
   ───────────────
   Critical: N  |  High: N  |  Medium: N  |  Low: N
   Automated: N  |  Manual: N  |  Both: N
   
   Ready for /defect-cycle fix
   ```

---

## Phase 2: Fix

**Goal:** Diagnose root cause, fix code, commit, update Airtable.

### Steps

1. **Fetch defects** — Filter Status = "In Analysis". Process in Severity order.

2. **Guard rail:** If more than 5 defects are queued, ask the user for confirmation before proceeding. Offer to fix just Critical + High first.

3. **For each defect:**

   a. **Diagnose:**
   - Read the Description, Reproduction Steps, and any Related Test Case data
   - Search the codebase for the relevant files (use Grep/Read based on the defect context)
   - Trace the code path to identify the root cause
   - Write the **Root Cause** field in Airtable with a clear explanation

   b. **Fix:**
   - Make the minimal code change to resolve the issue
   - If the fix touches security-sensitive code (auth, billing, user data), note this in the commit message
   - If the defect cannot be fixed (product decision, needs infrastructure, unclear requirements):
     - Set Status → "Deferred" or "Won't Fix"
     - Write explanation in Resolution Notes
     - Skip to next defect

   c. **Commit:**
   - Commit with message format: `fix(<area>): <description>`
   - Example: `fix(billing): validate priceId against allowlist before checkout`

   d. **Update Airtable:**
   - `Status` → "Fixed"
   - `Fix Commit` → the git commit hash (short form, 7 chars)
   - `Resolution Notes` → what was changed, which files, and why
   - `Resolution Date` → today's date (ISO format YYYY-MM-DD)
   - If a Related Test Case exists, update the test case's `Related Commit` field with the same hash

4. **Print fix summary:**
   ```
   FIX PHASE COMPLETE
   ──────────────────
   Fixed: N defects
   Deferred: N defects
   Commits: <list of hashes>
   
   Ready for /defect-cycle verify
   ```

---

## Phase 3: Verify

**Goal:** Run automated tests, update test cases, generate manual test checklist.

### Steps

1. **Run automated tests:**
   - Execute `npm run test` and capture results
   - Execute `npm run build` to verify no build breakage
   - Execute `npm run lint` for code quality

2. **Code-level verification for each "Fixed" defect:**
   - Re-read the relevant code to confirm the fix is in place
   - For pattern-based checks (e.g., "rate limiter exists on endpoint"), grep for the expected pattern
   - If Supabase state matters, query via `execute_sql`

3. **Update Airtable for automated-pass defects:**
   - Defect: `Status` → "Verified"
   - Related Test Case (if linked):
     - `Result` → "Pass"
     - `Last Run` → today (ISO)
     - `Notes` → append "Verified by Claude Code — [description of what was checked]"

4. **Generate manual test checklist for Test Type = "Manual" or "Both":**
   - For each defect needing manual verification, output:
     ```
     ☐ [TC-XXX] Title (Severity)
       Steps: <from test case or defect reproduction steps>
       Look for: <expected result>
     ```

5. **Print verify summary:**
   ```
   VERIFICATION COMPLETE
   ─────────────────────
   Auto-verified:  N defects → Status: Verified
   Manual needed:  N defects → checklist above
   Test suite:     N passed, N failed
   Build:          ✓ clean
   Lint:           ✓ clean
   
   Manual tests remaining — run them in the browser, then report results.
   After manual testing, use /defect-cycle verify again or report results inline.
   ```

---

## Phase: Status

**Goal:** Quick overview without modifying anything.

### Steps

1. Fetch all defects from Airtable (no filter).
2. Count by Status and Severity.
3. Print:
   ```
   DEFECT TRACKER STATUS
   ─────────────────────
   New:          N
   In Analysis:  N
   In Progress:  N
   Fixed:        N
   Verified:     N
   Closed:       N
   Deferred:     N
   Won't Fix:    N
   ─────────────────────
   Total:        N
   
   Next action: [context-aware suggestion]
   ```

---

## Rules

1. **One commit per defect.** Do not batch fixes into a single commit.
2. **Minimal diffs.** Fix the defect, nothing else. No refactoring, no cleanup.
3. **Never auto-close.** Defects go from Fixed → Verified, never straight to Closed. Human closes.
4. **Severity determines order.** Always process Critical before High before Medium before Low.
5. **Defer, don't guess.** If a fix requires a product decision or external access you don't have, set Deferred with a clear explanation rather than guessing.
6. **Confirm before bulk fixes.** If more than 5 defects are in queue, ask the user first.
7. **Test Type is permanent.** Once set during triage, don't change Test Type unless the user asks.
8. **Date format.** All dates written to Airtable use ISO format: YYYY-MM-DD.
9. **Commit message format.** Always use `fix(<area>): <description>` conventional commit format.
10. **Report results to user.** Always print the phase summary at the end. The user should see what happened without checking Airtable.
