# Clausplex Scores

Public, wallet-free nickname leaderboard API used by the Claus-hosted game.
A nickname is a public display label, not a verified account or reserved name.
Players register on starting a named game; winning replays queue automatically.
Only a protected verifier can publish scores. GitHub Actions replays inputs in
our pinned original game engine before posting a verdict. The browser has no
service key. No raw IP addresses are stored.

Server-only secret: `VERIFIER_KEY`, also `CLAUS_SCORES_KEY` in the game repository's
Actions secrets. No prize or account ownership is implied. Runtime stores at most
50,000 attempts and accepts at most 500 pending replays; investigate quotas before
raising these bounds. Database migrations are schema-only in `drizzle/`.

Build: `bash scripts/build.sh`; validate: `node scripts/validate-artifact.mjs`.

`GET /boards` returns one overall table: unique completed levels descending, then
the sum of each level’s best verified time ascending. Nickname grouping is case
insensitive; replaying a level improves its best time without adding progress.
All verified player completions share this table; watched solves never submit.
The legacy `?level=N&assisted=false` query remains compatible with older clients.
