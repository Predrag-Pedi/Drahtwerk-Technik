# Offerten – erste Version

Browserlokales Offertentool ohne Bexio-API. Start über `offerten.html`.

## Ablauf

1. Offerte mit Kunde, Objekt, Nummer und Texten erfassen.
2. Anlagen anlegen und in Felder / Teile gliedern. Schrankbeschreibung, System, Masse, IP und Farbe erfassen.
3. CSV-Katalog importieren und Spalten zuordnen. Artikel suchen und dem aktiven Teil hinzufügen; alternativ freie Positionen anlegen.
4. Mengen, Grundpreise, Minuten, Materialzuschlag, Stundensatz und Angebotsrabatt prüfen.
5. Text mit Einzelpositionen oder Teil-Summen kopieren und in Bexio einfügen. Bexio-Preispositionen und MWST separat erfassen.

## Daten und Preisbasis

Keine VSAS-Daten enthalten. Die tatsächliche VSAS-Datei und deren Felddefinitionen liegen noch nicht vor. Der CSV-Import ist eine Vorbereitung, kein nativer VSAS-Adapter. Unterstützt UTF-8 oder Windows-1252, Semikolon/Komma/Tabulator, Kopfzeile, Text in Anführungszeichen und mehrzeilige Texte. Pflichtzuordnung: Artikelnummer, Bezeichnung, Grundpreis. Preise werden vom Anwender als CHF exkl. MWST bestätigt. Preiseinheit (z. B. 100) teilt den Preis in den Einzelpreis. Montagezeit gilt in Minuten pro einzelner Einheit. Führende Nullen in Artikelnummern bleiben erhalten. Doppelte Artikelnummern und ungültige Pflichtwerte brechen den ganzen Import ab.

Verkaufspreis pro Einheit = Grundpreis × (1 + Materialzuschlag / 100) + Minuten × Stundensatz / 60. Dieser Preis wird auf Rappen gerundet, danach der Positionsbetrag. Der Angebotsrabatt wird einmal vom Zwischentotal abgezogen. Kein automatischer MWST-Satz. Fehlende Preise oder Montagezeit ohne Stundensatz blockieren den Angebotstext.

Offerten und Katalog in IndexedDB auf dem jeweiligen Gerät. Keine Synchronisation zwischen Mitarbeitern oder Geräten. JSON-Sicherung enthält die ausgewählte Offerte mit ihren Positionspreisen, nicht den gesamten Artikelstamm. Der Artikelstamm kann separat als CSV gesichert werden. Restore öffnet eine unabhängige Kopie. Katalogwechsel verändert bestehende Offertpreise nicht. Keine Kundendaten oder Preise im öffentlichen Repository ablegen.

## Noch offen

- Nativer VSAS-Import nach Erhalt eines echten Exports samt Preis-/Zeitfeldbeschreibung.
- Automatischer Schrankkonfigurator / Stücklistengenerator benötigt Artikelbeziehungen und Konfigurationsregeln. Aktuell Schrankbeschreibung und manuelle bzw. katalogbasierte Stückliste.
- Kein eigenständiges gestaltetes PDF; Ausgabe für Übernahme in das bestehende Bexio-Angebotslayout.

## Prüfung

`node --test tests/*.test.mjs` (118 Tests beim Anlegen).
Browserprüfung mit synthetischen Daten: Produktion/Büro, freie Position, Mengen/Zuschlag/Rabatt, mehrere Teile, CSV-Import und Preiseinheit 100, Katalogzuordnung, Montage, Persistenz nach Reload, JSON-Download und Restore. Nicht mit echten VSAS-Daten oder in Bexio getestet. Referenzvideos wurden anhand verteilter Frames und Detailansichten des Angebots-/Stücklistenablaufs ausgewertet, ohne Audiotranskription.
