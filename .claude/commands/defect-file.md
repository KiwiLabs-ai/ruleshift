---
description: "Quick defect filing during manual testing. Describe what went wrong and a defect record is created in Airtable with all fields populated."
---

# Defect File

Quick defect filing during manual testing. Describe what went wrong and this skill creates the Airtable defect record with all fields populated.

## Usage

```
/defect-file <description of what went wrong>
/defect-file TC-015 regenerate button shows spinner but never completes
/defect-file login page accepts empty password field
```

## Airtable Reference

| Name | ID |
|------|----|
| Base | `appbyB1twnzgbzAjO` |
| Defects table | `tblBKC74sPz3Dy5d6` |
| Test Cases table | `tblqkrLrdZv6E1rTU` |
| Features table | `tblpNVx908xCK0QC4` |

### Defects Field IDs

| Field | ID |
|-------|----|
| Title | `fldpDNoFlyIWgaexW` |
| Description | `fldtGcyDV1VoualC1` |
| Severity | `fldMz1mkP24HvRa4l` |
| Status | `fldMnpyFzQkJrD18K` |
| Reproduction Steps | `fldaix1G4V1rh1Y7C` |
| Affected Feature | `fldqrpc636FYQoPyR` |
| Reported By | `fld3WzgmUHzW0WyZZ` |
| Reported Date | `fldp72sr3tPb36joz` |
| Related Test Case | `fldOiFaYyLftdrEEw` |
| Test Type | `fld4S8PZct40aQ5fv` |
| Root Cause | `fld7SHMeLrhLsNRgM` |

### Feature Area → Test Case Mapping

Used to find the Related Test Case when a TC-XXX ID is provided in the description.

---

## Workflow

### Step 1: Parse the user input

Extract from `$ARGUMENTS`:
- **What went wrong** — the core defect description
- **Test case reference** — if the user mentions TC-XXX, this links to the Manual Test Cases table
- **Feature area** — infer from context (Sources, Alerts, Briefs, Monitoring, Team, Settings, Onboarding, Billing, Auth, Export)

### Step 2: Determine severity

Apply these rules:
- **Critical** — data loss, security vulnerability, app crash, auth bypass
- **High** — feature completely broken, blocking user workflow
- **Medium** — feature partially broken, workaround exists
- **Low** — cosmetic, minor UX issue, edge case

### Step 3: Determine test type

- If the defect can be verified by reading code or running tests → **Automated**
- If it requires visual/browser confirmation → **Manual**
- If both → **Both**

### Step 4: Find Related Test Case (if TC-XXX referenced)

If the user mentioned a test case ID (e.g., TC-015):
1. Search the Manual Test Cases table for a record where Name starts with the given TC-XXX
2. Capture its record ID for linking

### Step 5: Find Affected Feature

Search the Features table for a record matching the inferred feature area. Capture its record ID for linking.

### Step 6: Create the defect record

Use `create_records_for_table` on `tblBKC74sPz3Dy5d6` with:

```json
{
  "Title": "<Feature Area> — <short summary>",
  "Description": "<full description from user input, expanded with technical context if possible>",
  "Severity": "<Critical|High|Medium|Low>",
  "Status": "New",
  "Reproduction Steps": "<steps inferred from user description and test case if linked>",
  "Reported By": "Manual Tester",
  "Reported Date": "<today ISO>",
  "Test Type": "<Automated|Manual|Both>",
  "Related Test Case": ["<record ID if TC-XXX was referenced>"]
}
```

If an Affected Feature record was found, include it in the record.

### Step 7: Update the test case (if linked)

If a Related Test Case was found:
- Set `Result` → "Fail"
- Set `Last Run` → today (ISO)
- Append to `Notes`: "Defect filed: <defect title>"

### Step 8: Confirm to user

Print:
```
DEFECT FILED
────────────
Title:     <title>
Severity:  <severity>
Test Type: <test type>
Status:    New
Linked TC: <TC-XXX or "none">

Ready for /defect-cycle to pick up.
```

---

## Rules

1. **Always set Status to "New".** The defect-cycle skill handles lifecycle transitions.
2. **Always set Reported By to "Manual Tester".** This distinguishes from Claude-discovered defects.
3. **Ask if unsure about severity.** If the description is ambiguous, ask the user rather than guessing.
4. **One defect per invocation.** If the user describes multiple issues, file them separately.
5. **Date format.** ISO: YYYY-MM-DD.
