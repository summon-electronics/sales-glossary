# Summon Electronics Sales Glossary

Public site: https://glossary.summonelec.com

Cloudflare Pages project: sales-glossary. Production branch: main. Framework: None. Build command: empty. Output directory: repository root (/). Git commits deploy automatically.

## Configuration

In the Pages project's Production settings, bind the KV namespace glossary as GLOSSARY. Add ADD_PASSCODE as a Secret, then redeploy. Keep the passcode out of this repository. Preview editing should use a separate KV namespace and secret if enabled.

## Shared editing

The original glossary is in index.html. shared-terms.js adds team editing. functions/api/kv.js provides public GET and passcode-protected PUT at /api/kv?key=glossary-custom-terms. The x-glossary-key header is checked against ADD_PASSCODE on the server. Added terms are stored as one JSON array at glossary-custom-terms, using John's exact functions/api/kv.js sample. The frontend loads the current list, applies the addition/deletion, and PUTs the updated list. KV reads may be stale for about a minute, so saves within that window can overwrite one another even when they are not simultaneous, as with the original sample. No team terms existed at the time of the switch.

Only team-added terms have delete buttons. To change original entries, edit index.html. User text is escaped before rendering. The passcode is not saved in browser storage. Cloudflare KV is eventually consistent, so remote devices may take around a minute to show additions/deletions. Open tabs refresh shared data every 30 seconds.

## Release checks

Code-level checks passed for original 301 entries, unchanged built-in content, search, print-filter reset, wrong-passcode rejection, shared additions across two simulated clients, authorized/unauthorized deletion, and escaped HTML. Visual browser/print checks and a correct-passcode production write require final verification.

1. Open the public site in an incognito window without signing in.
2. Search line card, then Save as PDF; verify the print view includes every section.
3. Add a test term with a wrong passcode (must fail), then the correct passcode.
4. Open the site on another device and confirm the term appears after synchronization.
5. Delete the test term with its delete button and the passcode.

## Operations

Reps can add/delete team terms without deployments. To rotate the passcode, change ADD_PASSCODE in Cloudflare and redeploy. For larger content changes, update index.html on main. KV data remains independent of the HTML deployment.
