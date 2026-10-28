# Importing a system's existing users

When a system moves to Auther Space it can bring its current users along. You
send their email and type; Auther Space emails each new person an invitation
to choose a password. Passwords never leave your system and are never sent.

```bash
curl -u "$AUTHER_CLIENT_ID:$AUTHER_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"users":[
        {"email":"registrar@school.example","type":"hei","uii":"12074g","name":"Maria Santos"},
        {"email":"juan@chedro12.com","type":"region"}
      ]}' \
  https://systems.chedro12.com/api/v1/system/users/import
```

- Authenticate with the system's own client ID and secret (HTTP Basic, the same credentials as the token endpoint). Public clients can't import.
- `type` is required: `hei` or `region`. `name` is optional; the invitee can change it when accepting.
- `uii` is required for new HEI accounts. Fetch choices from public `GET https://systems.chedro12.com/api/heis` (`data`: `{uii, name, province, city_municipality}`). Preserve the entire string, including campus letters. Regional Office accounts must omit it.
- Any authorized inviter can fill an existing HEI account’s missing UII. A different assigned UII fails validation before granting access; only a superadmin can correct it. The inviter must confirm the recipient is authorized to represent the chosen institution.
- A missing initial directory snapshot returns `503 temporarily_unavailable`; retry later. A failed refresh retains the previous snapshot.
- Send at most 500 users per request. Split bigger lists into batches.
- Every imported person is granted access to your system.

Each row in `results` has a `status`:

| status | Meaning |
|---|---|
| `invited` | New account created; invitation emailed (`email_sent: true`) |
| `already_invited` | Invited before and hasn't accepted. Emailed again unless they already got 3 invitation emails today |
| `existing_user` | Already has an Auther Space account. Access granted; a supplied UII may fill a missing affiliation; no email |
| `invalid` | Not imported; `error` says why |

```json
{
  "summary": { "invited": 1, "existing_users": 1, "invalid": 0 },
  "results": [
    { "email": "registrar@school.example", "user_id": "…", "status": "invited", "email_sent": true },
    { "email": "juan@chedro12.com", "user_id": "…", "status": "existing_user", "email_sent": false }
  ]
}
```

Notes:

- Running the import again is safe, but each run re-sends to everyone still pending. Each address gets at most 3 invitation emails per day (Asia/Manila), and a re-run never changes an existing account's password or type. Every email's link stays valid, so a late email still works.
- Invitation links expire 7 days after their email. Re-running the import after that sends a fresh link.
- `user_id` is the OIDC `sub` the person will have when they sign in, so you can link your local account to it right away.
- Until they accept, invitees can't sign in. After accepting they land on your system's login initiation URL.
