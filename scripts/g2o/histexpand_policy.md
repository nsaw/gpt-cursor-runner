# NB-2.0 History Expansion Guard
- Do not use inline `node -e` inside nb-safe-detach commands.
- Use only file-based Node utilities (scripts/g2o/*.js).
- If inline evaluation is unavoidable, refuse and emit SUMMARY explaining why.
