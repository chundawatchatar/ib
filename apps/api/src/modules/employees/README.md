# Employee API

## Employee directory

`GET /api/employees` returns `{ items, page, pageSize, total }`. Each item includes
employee identifiers, name, country and currency codes, country/department/title
labels, currency precision, local salary in integer minor units, activity, and
version. The directory includes active and inactive employees by default.

| Query | Behavior |
| --- | --- |
| `page`, `pageSize` | One-based page (default 1, maximum 1,000,000); size 1–100 (default 25) |
| `search` | Trimmed literal case-insensitive substring of name or code; maximum 200 characters; no control characters |
| `countryCode`, `currencyCode` | Exact uppercase two-letter country / three-letter currency code |
| `departmentId`, `level` | Exact department UUID / level (maximum 100 characters; no control characters) |
| `salaryMin`, `salaryMax` | Inclusive integer minor-unit bounds, 0 through the JavaScript safe-integer maximum; require `currencyCode`; minimum cannot exceed maximum |
| `status` | `all` (default), `active`, or `inactive` |
| `sortBy` | `name` (default), `code`, `country`, `department`, `level`, `currency`, or `salary` |
| `sortDirection` | `asc` (default) or `desc` |

Country and department sorts use display names; salary sorts use stored local
minor-unit amounts. Use a currency filter for meaningful salary comparisons.
All sorts use employee ID ascending to break ties. Filters combine with AND;
name/code search uses OR. Empty or out-of-range pages retain the full matching
count. Count and page reads share a read-only repeatable-read transaction.
Unknown query keys, malformed values, and repeated scalar parameters return 400
with field-level query issues. Well-formed filters without matches return 200
with an empty population.

For example, `/api/employees?currencyCode=USD&salaryMin=10000000&pageSize=50`
finds annual USD salaries of at least $100,000, returning up to 50 rows.

## Employee management

| Endpoint | Input | Success | Expected failures |
| --- | --- | --- | --- |
| `POST /api/employees` | Complete profile plus `currencyCode` and `salaryMinorUnits` | 201 employee | 400 invalid fields/references; 409 duplicate code |
| `GET /api/employees/:id` | Employee UUID | 200 employee, including inactive records | 400 invalid UUID; 404 absent employee |
| `PUT /api/employees/:id` | Complete profile plus expected `version` | 200 updated employee | 400 invalid fields/references; 404 absent employee; 409 stale version or duplicate code |
| `POST /api/employees/:id/deactivate` | `{ version }` | 200 inactive employee | 400 invalid input; 404 absent employee; 409 stale version |

The complete profile consists of `code`, `name`, `countryCode`, `departmentId`,
`level`, and `jobTitleId`. Text is trimmed, required, and rejects control
characters; code/level are capped at 100 characters and name at 200. Country
codes are uppercase two-letter codes; currency codes are uppercase three-letter
codes. Reference IDs must be UUIDs naming installed master data. Titles can be
shared across departments; a country's default currency does not restrict the
explicit salary currency. Salary is a positive safe integer in local minor units.
All request bodies reject unknown fields.

Employee responses contain the directory fields plus ISO UTC `createdAt` and
`updatedAt`. Creation generates the UUID, sets `active: true` and `version: 1`,
and stores the initial salary. Profile editing leaves salary/currency unchanged;
those fields are rejected by the profile-edit contract and belong to the next
salary-edit endpoint. Creation and profile edits do not write salary-change rows.

Profile edits and deactivation require the current integer version (1 through
2,147,483,646), lock the employee row, and advance the version and update time
atomically. A stale write returns 409 without changing the employee. Deactivation
retains the row and its audit history; repeating it with the current inactive
version returns the same employee without advancing its version or timestamp.
A retry with an older version remains a conflict. Profile edits may update
inactive employees and keep them inactive. No reactivation or deletion endpoint
is provided.

Unknown references return 400 with body field issues. Duplicate codes return
409 with a `code` issue; stale versions return 409 asking the client to reload.
Other errors use the shared error responses documented above. Failed writes
leave salary, profile, activity, version, timestamps, and history unchanged.
