# Git history replay

```powershell
.\scripts\generate-commit-messages.ps1 -TargetTotal 212
.\scripts\replay-history.ps1 -TargetTotal 212
git push --force-with-lease origin main
```
