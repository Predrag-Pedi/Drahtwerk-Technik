# Werkstattvorlagen – Prüfung vom 23.11.2026

## Automatisierte Prüfung

- `node --test tests/*.test.mjs`: **665 Tests bestanden**, keine Fehler.
- Darin `node --test tests/platform-*.test.mjs`: **39 Prüfungen bestanden**.
- Neue Integrationstests: Standardvorlagen, gemeinsame Firmenvorlage, fremde Firma, Mitarbeiter/Administrator mit fehlenden Schreibrechten, CSRF/Betriebskennung, Versionskonflikt und Reset, Dateiinhalt/Dateiname, fremde Dateireferenzen, PDF-/Bildzugriffe, Löschschutz verwendeter Dateien, Rollenänderung während eines Uploads, gemeinsames Speicherlimit, Persistenz nach Datenbank-Neustart und CSV-Ausgabe.
- Syntaxprüfung der neuen Module und `git diff --check` erfolgreich.

## Browserprüfung

Mit dem Cloud-Browser gegen den tatsächlichen Node-Server und einer ausschliesslich synthetischen Datenbank geprüft. Der lokale QA-Wrapper stellte vorbereitete Sitzungen für einen Firmenadministrator, einen Mitarbeiter desselben Betriebs und einen zweiten Betrieb bereit; keine persönlichen Konten oder Kundendaten verwendet. Wrapper, Sitzungen und Beispieldateien sind nicht Teil des Repositorys.

- Kontomenü → Werkstattvorlagen öffnet den Editor mit den vier Bereichen.
- Administrator ändert Seitenprofil-Abzug von 40 auf 75 mm und speichert. Mitarbeiter erhält bei Höhe 1000 mm **925 mm**, bei zwei Stück **1850 mm**. Keine Bearbeitungsaktion für Firmenvorlagen beim Mitarbeiter.
- Ein geänderter Drahtfarbeneintrag erscheint beim Mitarbeiter.
- Eigener EW-Ordner, Hinweistext und PDF werden hochgeladen und gespeichert. Mitarbeiter sieht Hinweis und Dokument; PDF wird gerendert und über die bestehende Zählerplatten-Suche gefunden.
- Ein bearbeiteter Dokument-Anzeigename wird in der EW-Dokumentliste übernommen.
- Eigene Aufbauzeichnung wird hochgeladen, gespeichert und beim Mitarbeiter sowohl in der Übersicht als auch in der Vergrösserung geladen.
- Zweite Firma verwendet weiterhin **960 mm** beim Seitenprofil und sieht den eigenen EW-Ordner der ersten Firma nicht.
- Tabelleneditor und Dateiverwaltung visuell kontrolliert. Eine separate iPad-Geräteprüfung wurde nicht durchgeführt.

## Betriebsgrenzen

Kein Hosting gebucht oder produktiver Server umgestellt. Der Pull Request muss vor Verwendung auf dem Zielserver übernommen werden; GitHub Pages führt das Backend nicht aus. `workshop_templates` und `workshop_files` werden beim Start einer bestehenden Datenbank hinzugefügt. Auf Standard zurücksetzen ist durch monotone Revisionen geschützt und löscht keine Uploads.

Uploads sind auf 10 MB je Datei und 250 eigene Dateien je Werkzeug begrenzt; Projekte und Werkstattdaten teilen sich die bestehende Grenze von 500 MB pro Betrieb. Das ist ein konfiguriertes Testlimit der Anwendung. Aufbauabstände bleiben Zeichnungen mit Hinweisen. Aktuelle Schienenberechnungen bleiben lokal pro Betrieb/Benutzer; ihre Firmenregeln werden zentral gespeichert.
