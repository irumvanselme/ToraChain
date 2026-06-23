---
id: TORA-CHAIN-7
title: add quick actions for editing statuson the elections card
stage: Done
creation_date: 2026-06-22T16:51:43.669430Z
---

I am going to update the election status with the following statuses:

- Draft
  - The admin is allowed to edit all the information of the election.
- EnrollingVoters
  - The voters can check eligibility and register to vote.
- Scheduled
  - The election is scheduled to start happening on a specific date.
- Active
  - The election is currently happening and voters can vote.
- Ended
  - The election has ended and the results are being calculated.
- Archived
  - The election has ended and the results have been published.
- Paused
  - For some reason the admin decided to pause the election.

Tasks to work on:

- start and end date should be required when creating an election.
- Update the status for an election on all the apps to meeet the following statuses.
- Under @apps/admin-fe/ on the election card add three doted menue to with a dropdown with item Update status and they can be able to update status where it is relevant.
- Given the ui status respective buttons should be show and hidden
- When an election is in above EnrollingVoters status, it can not go back to draft.
- If it is Archived, Ended, Paused, it can not go back to any other status.
-
