# Modulpfade beim Anwendungsstart

## Nachgewiesener Fehler

Nach PR 181 zeigte die Aufzeichnung den Startfehler für `/platform/shell.mjs`.
Die nachgereichte Browserkonsole nennt 404-Antworten für unter anderem:

- `/platform/client.mjs/model.mjs`
- `/platform/client.mjs/request.mjs`
- `/platform/account-menu.mjs/client.mjs`
- `/platform/account-menu.mjs/workshop-model.mjs`

Die Module wurden unter einer Adresse mit abschliessendem Schrägstrich geladen.
Relative Imports werden dadurch unterhalb des Dateinamens aufgelöst. Der Server
lieferte bisher dieselbe Datei für `client.mjs` und `client.mjs/` aus, ohne die
Adresse zu korrigieren. Damit können weder Anwendungshülle noch Vorlagen starten.

Öffentliche HTTP-Abfragen der produktiven Module lieferten zum Prüfzeitpunkt
direkt 200 mit korrektem JavaScript-Inhalt. Eine früher gespeicherte permanente
Weiterleitung ist eine mögliche Erklärung für das abweichende Browserverhalten;
ihre ursprüngliche Quelle wurde nicht nachgewiesen.

## Änderung

Existierende `.mjs`- und `.js`-Dateien mit abschliessendem Schrägstrich erhalten
eine temporäre 307-Weiterleitung zur Dateiadresse. Der Parameter `sb_module_path=1`
verhindert, dass eine gespeicherte Weiterleitung der alten Adresse eine Schleife
auslöst. Vorhandene Parameter bleiben erhalten, ebenso `Cache-Control: no-store`.
Auch URL-kodierte Schrägstriche werden berücksichtigt.

Die Weiterleitung erfolgt erst nach den bisherigen Pfad-, Datei- und
Berechtigungsprüfungen. Fehlende verschachtelte Pfade bleiben 404. Geschützte
CAD-Dateien verlangen weiterhin eine Sitzung. Benutzer, Firmendaten und
Datenbankschema werden nicht verändert.

## Prüfung

- `npm test`: 708 Tests erfolgreich.
- Neue Integrationstests prüfen kanonische Moduladressen, alte 301-Weiterleitungen,
  relative Imports, Query-Parameter, HEAD, Verzeichnisse und geschützte Dateien.
- Isolierte Browserprüfung in Chromium mit Testfirma und einem Mitarbeiter,
  der ausschliesslich Schreibrechte für Schienen besitzt.
- Eine cachefähige 301-Weiterleitung auf `client.mjs/` und `account-menu.mjs/`
  reproduzierte vor der Änderung den Fehlerbildschirm aus der Aufzeichnung.
- Nach Serverneustart mit Korrektur genügte normales Neuladen im selben Browser;
  der Browsercache wurde nicht gelöscht und die simulierte Weiterleitung blieb
  aktiv. Benutzername und 15 Schienen erschienen wieder.
- Firmenvorlage geöffnet, Seitenprofil-Abzug auf 43 mm geändert und gespeichert.
  Nach Navigation über Dashboard zum Schienenrechner blieb der Name sichtbar;
  bei 1000 mm Höhe wurde die gespeicherte Länge von 957 mm angezeigt.

Ein physisches iPad wurde nicht getestet. Die Bestätigung auf den betroffenen
Produktionsgeräten erfolgt nach der Installation.

## Installation nach Merge

```sh
git -C /srv/customer/sites/schaltbase.ch pull --ff-only origin main
```

Danach unter **schaltbase.ch → Dashboard → Node.js → Neu starten** die Anwendung
neu starten und die Seite im Browser neu laden.
