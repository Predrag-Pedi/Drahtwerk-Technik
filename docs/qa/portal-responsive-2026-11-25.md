# Lizenzen und Berechtigungen auf Handy und Tablet

## Änderung

- Bis 1100 px wird die Bereichsnavigation zu einem aufklappbaren Menü. Nach einer Auswahl schliesst es sich und der Fokus geht zum Seitentitel; Escape schliesst es ebenfalls.
- Betriebs-, Benutzer- und Protokolltabellen werden zu beschrifteten Karten: eine Spalte auf Handys, zwei auf Tablets. Auf dem Desktop bleiben Tabellen und Seitenleiste erhalten.
- Formularfelder und Aktionen haben grössere Touchflächen. Dialogkopf und Speichern bleiben sichtbar, während die Felder innerhalb des Dialogs scrollen. Fehler werden in den sichtbaren Bereich gescrollt.
- Die Anpassungen sind auf das Portal beschränkt. Rollen, API-Prüfungen, Lizenzlogik und Firmendaten wurden nicht geändert.

## Browserprüfung

Lokaler Node-Server mit isolierter SQLite-Datenbank und ausschliesslich erfundenen Testkonten. Chromium; responsive Ansicht über gleichursprüngliche Iframes. Getestete Rahmen: 320 × 700, 390 × 844, 820 × 1080, 1024 × 768 sowie Desktop 1363 × 936. Die Inhaltsbreite ist wegen der Desktop-Scrollleiste jeweils etwas kleiner als die Rahmenbreite.

- Kein horizontaler Seitenüberlauf bei den geprüften Handy- und Tabletbreiten.
- Betriebs- und Mitarbeiterkarten mit langen Firmennamen und E-Mail-Anmeldenamen lesbar.
- Entwickler- und Firmenadmin-Ansicht geprüft; erlaubte Aktionen und Navigationspunkte bleiben unterschiedlich.
- Menü öffnen, Bereich wechseln, automatisches Schliessen, Tastaturfokus, Escape und Kontomenü geprüft.
- Lizenzdialog: Benutzerplätze in den Testdaten erfolgreich gespeichert; ungültige Eingabe zeigt die Fehlermeldung im sichtbaren Dialogbereich.
- Berechtigungsdialog auf 320/390 px: letzte Felder durch Scrollen erreichbar; Speichern und Schliessen bleiben sichtbar.
- Desktop: Tabellenansicht und Betriebsfilter funktionieren weiter.

Ein physisches iPad mit Safari und die Bildschirmtastatur wurden hier nicht getestet.

## Automatische Prüfungen

`node --check platform/portal.mjs` und `git diff --check` erfolgreich.

42 Tests erfolgreich:

```sh
node --test tests/platform-user-management.test.mjs tests/platform-support.test.mjs tests/platform-page-paths.test.mjs tests/platform-workflow.test.mjs
```
