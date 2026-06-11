# One-time setup (about 15 minutes)

You'll do steps 1–4 on a computer browser. Claude can do step 5 for you in a
Cowork session once the repos exist.

## 1. GitHub account

If you don't have one: https://github.com/signup (free).

## 2. Create the two repos

On https://github.com/new :

| Repo name | Visibility | Why |
|---|---|---|
| `slipstream` | **Public** | Free GitHub Pages hosting only works on public repos. It's only app code — no personal data. |
| `slipstream-data` | **Private** | Your actual checklists. |

Leave both empty (no README/license — we're pushing existing folders).

## 3. Fine-grained access token (for the app on your devices)

1. GitHub → click your avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → *Generate new token*.
2. Name: `slipstream`, expiration: 1 year (set a reminder; the app will just
   show "sync error" when it lapses).
3. **Repository access**: *Only select repositories* → `slipstream-data` only.
4. **Permissions** → Repository permissions → **Contents: Read and write**.
   Nothing else.
5. Generate, and copy the `github_pat_…` string somewhere safe for step 6.

This token can touch exactly one repo (your data repo) and nothing else.

## 4. Turn on GitHub Pages

In the `slipstream` repo: **Settings → Pages** → Source: *Deploy from a
branch* → Branch: `main`, folder `/ (root)` → Save.

Your app URL will be `https://<your-username>.github.io/slipstream/`
(takes a minute or two on first deploy).

## 5. Push the code (ask Claude)

In a Cowork session in this folder, say: *"Push slipstream and slipstream-data
to my GitHub, username \<your-username\>."* Git will pop up a browser sign-in
the first time. Or do it yourself:

```powershell
cd slipstream
git remote add origin https://github.com/<you>/slipstream.git
git push -u origin main

cd ..\slipstream-data
git remote add origin https://github.com/<you>/slipstream-data.git
git push -u origin main
```

## 6. Connect your devices

On each device (phone first!):

1. Open `https://<you>.github.io/slipstream/` in Chrome.
2. **Android install**: menu (⋮) → *Add to Home screen* → *Install*.
3. In the app: ⚙️ → enter your GitHub username, repo `slipstream-data`,
   branch `main`, and paste the token → Save.
4. The pill in the top bar should flip to **synced** and your real lists
   replace the demo data.

Done. From now on, checking things off on any device syncs everywhere, and
Claude sessions can add/update lists by editing the data repo.
