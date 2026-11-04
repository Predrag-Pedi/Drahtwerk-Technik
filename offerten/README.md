# Offerten – Übersicht und gestaffelte Bearbeitung

Browserlokales Offertentool ohne Bexio-API. Start über `offerten.html`.

## Ablauf

1. Gespeicherte Offerte in der Übersicht öffnen oder «Neue Offerte» wählen. Die Bearbeitung öffnet sich von rechts mit Bereichen für Angebotsdaten, Anlagen und Kalkulation/Export.
2. Anlagen anlegen und in Felder / Teile gliedern. Schrankbeschreibung, System, Masse, IP und Farbe erfassen.
3. Anlage → Anlagenteil → Artikelstamm in gestaffelten Fenstern öffnen. CSV-Katalog importieren und Spalten zuordnen oder eigene Artikel mit Typ, Materialpreis, Einbau-/Anschlusszeit und optionalem Stundensatz erstellen und bearbeiten. Importierte Artikel lassen sich als eigene Kopie übernehmen.
4. Mengen, Grundpreise, Minuten, Materialzuschlag, Stundensatz und Angebotsrabatt prüfen.
5. Text mit Einzelpositionen oder Teil-Summen kopieren und in Bexio einfügen. Bexio-Preispositionen und MWST separat erfassen.

## Daten und Preisbasis

Keine VSAS-Daten enthalten. Die tatsächliche VSAS-Datei und deren Felddefinitionen liegen noch nicht vor. Der CSV-Import ist eine Vorbereitung, kein nativer VSAS-Adapter. Unterstützt UTF-8 oder Windows-1252, Semikolon/Komma/Tabulator, Kopfzeile, Text in Anführungszeichen und mehrzeilige Texte. Pflichtzuordnung: Artikelnummer, Bezeichnung, Grundpreis. Preise werden vom Anwender als CHF exkl. MWST bestätigt. Preiseinheit (z. B. 100) teilt den Preis in den Einzelpreis. Montagezeit gilt in Minuten pro einzelner Einheit. Führende Nullen in Artikelnummern bleiben erhalten. Doppelte Artikelnummern und ungültige Pflichtwerte brechen den ganzen Import ab.

Verkaufspreis pro Einheit = Grundpreis × (1 + Materialzuschlag / 100) + Minuten × (Artikel-Stundensatz oder Standard-Stundensatz der Offerte) / 60. Dieser Preis wird auf Rappen gerundet, danach der Positionsbetrag. Der Angebotsrabatt wird einmal vom Zwischentotal abgezogen. Kein automatischer MWST-Satz. Fehlende Preise oder Montagezeit ohne Stundensatz blockieren den Angebotstext.

Offerten, importierter Katalog und eigene Artikel werden getrennt in IndexedDB auf dem jeweiligen Gerät gespeichert. Ein Import ersetzt nur den importierten Katalog. Eigene Artikel bleiben erhalten; Stammdatenänderungen verändern keine bereits hinzugefügten Offertpositionen. Keine Synchronisation zwischen Mitarbeitern oder Geräten. JSON-Sicherung enthält die ausgewählte Offerte mit ihren Positionspreisen, nicht den gesamten Artikelstamm. Der Artikelstamm kann separat als CSV gesichert werden. Restore öffnet eine unabhängige Kopie. Katalogwechsel verändert bestehende Offertpreise nicht. Keine Kundendaten oder Preise im öffentlichen Repository ablegen.

## Noch offen

- Nativer VSAS-Import nach Erhalt eines echten Exports samt Preis-/Zeitfeldbeschreibung.
- Automatischer Schrankkonfigurator / Stücklistengenerator benötigt Artikelbeziehungen und Konfigurationsregeln. Aktuell Schrankbeschreibung und manuelle bzw. katalogbasierte Stückliste.
- Kein eigenständiges gestaltetes PDF; Ausgabe für Übernahme in das bestehende Bexio-Angebotslayout.

## Prüfung

`node --test tests/*.test.mjs` (122 Tests).
Browserprüfung mit synthetischen Daten: Produktion/Büro, freie Position, Mengen/Zuschlag/Rabatt, mehrere Teile, CSV-Import und Preiseinheit 100, Katalogzuordnung, Montage, Persistenz nach Reload, JSON-Download und Restore. Nicht mit echten VSAS-Daten oder in Bexio getestet. Referenzvideos wurden anhand verteilter Frames und Detailansichten des Angebots-/Stücklistenablaufs ausgewertet, ohne Audiotranskription.

Version 20261104-2: Übersicht und fünf Dialogebenen, eigene Artikel erstellen/bearbeiten, Speichern und erneutes Öffnen nach Reload im Browser geprüft. Testartikel: CHF 40 Material mit 20 % Zuschlag plus 15 Minuten à CHF 120/h ergeben CHF 78. Header-Geometrie, Markenschrift und Startseiten-Button im Browser mit Schienenrechner verglichen: identisch. Keine echten VSAS-Daten vorhanden.
