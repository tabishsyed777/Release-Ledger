# Release Ledger

**A release evidence workspace for assigning verification owners, recording outcomes, and connecting a ship decision to review notes.** Turn a Change Radar impact report into a reviewable checklist that a team can complete together.

## What it does

- Import a `change-radar-report` JSON file or explore the explicitly labeled sample release.
- Add or remove checks and assign an accountable owner to each one.
- Record `Not run`, `Pass`, `Fail`, `Blocked`, or `N/A` plus an evidence link or note.
- Track record completeness and export a portable `release-ledger-record` JSON file.
- Require every check to have an owner, a `Pass` or `N/A` outcome, and evidence before recording a ready decision.

## Run it

Open `index.html` in a current browser. There is no build step, server, account, or external service. Import the report exported by [Change Radar](https://github.com/tabishsyed777/Change-Radar), or choose **Explore sample** to see the review flow.

## Privacy and scope

The record is stored in this browser's `localStorage` until you clear it. Export the JSON file to share or preserve a release review. The sample evidence is synthetic and labeled `SAMPLE`. Evidence fields are not checked, and marking the record ready does not run tests or deploy software; it records a human decision for the release review.

Released under the MIT License.
