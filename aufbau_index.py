#!/usr/bin/env python3
"""Erzeugt die Bilderübersicht für GitHub Pages aus Aufbauabstaende/<Kategorie>/*."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = ROOT / "Aufbauabstaende"
EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
folders = []
if BASE.is_dir():
    for folder in sorted((p for p in BASE.iterdir() if p.is_dir() and not p.name.startswith(".")), key=lambda p: p.name.casefold()):
        images = sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXT), key=lambda p: p.name.casefold())
        folders.append({"name": folder.name, "images": [{"name": p.stem.replace("_", " "), "path": p.relative_to(ROOT).as_posix()} for p in images]})
(ROOT / "aufbau-dateien.json").write_text(json.dumps({"folders": folders}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(folders)} Kategorien, {sum(len(f['images']) for f in folders)} Bilder")
