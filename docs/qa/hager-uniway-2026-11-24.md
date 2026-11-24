# Hager Uniway – Prüfung vom 24. November 2026

## Umfang und Datenquelle

- Neuer Bereich `technik.html#uniway`, Werkstatt-Kachel und eigenständige Berechtigung `uniway` innerhalb der bestehenden Werkstatt-Lizenz.
- Öffentliche Produktseite mit drei animierten Beispielen, verlinkt im Werkzeugmenü und auf der Homepage.
- Grundlage: vom Nutzer bereitgestellte **Hager Uniway Tabelle.pdf**, gedruckte Seite 27. Die 56 Zeilen mit je fünf Werten wurden vollständig mit dem extrahierten PDF verglichen: **280 von 280 Werten stimmen überein**.
- Herstellerquelle: https://assets.sc.hager.com/de-ch/-/media/project/hagerdeep/switzerland/hager/b2b/pdf/hager_uniway_broschuere_de_24_web.pdf?la=de-ch#page=27
- Die auffälligen Originalwerte bei 44 PE (824/794 mm) und 74 PE (1357/1336 mm) bleiben unverändert und sind in Tabelle und Ergebnis gekennzeichnet. Keine rechnerisch vermutete Korrektur und keine Ableitung der Längen aus einem pauschalen 18-mm-Raster.
- UW-xxx-10 / UW-xxx-6 sind die Bezeichnungen der Quelle, keine erfundenen vollständigen Bestellnummern. Die Auswahl betrifft tabellierte Systemlängen und Sockelanzahlen, keine elektrische Auslegung.

## Automatisierte Prüfung

`npm test`: **712 bestanden, 0 fehlgeschlagen**.

Neue Modell- und HTTP-Tests prüfen Aufrundung auf tatsächlich vorhandene Kombinationen, halbe Einheiten, ungültige Eingaben, Grenzen, Sockelsummen, auffällige Quellwerte und unabhängige Berechtigungen. Ein Konto mit ausschliesslich Uniway-Zugriff kann die technischen Tabellen öffnen; ein Konto ohne passende Freigabe erhält keinen Zugang. Berechtigungen lassen sich über die bestehende Firmenverwaltung speichern und widerrufen. Lizenzsperren bleiben wirksam.

`git diff --check`: erfolgreich.

## Browserprüfung

Durchgeführt im lokalen Managed Preview mit synthetischen Konten und einer isolierten In-Memory-Datenbank:

- Uniway-only-Mitarbeiter: genau eine Werkstatt-Kachel, kein leerer Bürobereich, Kontoname sichtbar, nur der freigegebene Technik-Reiter sichtbar.
- 23,5 PE ergibt 24 PE, 0,5 Reserve, 473 mm Systemlänge, 434 mm Kupferschienenlänge, 0 Zehner- und 4 Sechser-Sockel.
- 44 PE zeigt den Quellenhinweis; 121 PE zeigt die fehlende Kombination; negative und leere Eingaben zeigen verständliche Meldungen.
- 120 PE und «Treffer in Tabelle anzeigen» markieren und erreichen die letzte Tabellenzeile.
- ABB Smissline bleibt nutzbar; Wechsel zwischen ABB und Hager aktualisiert Überschrift und Reiterzustand. Browser-Zurück kehrt zum vorherigen Reiter zurück.
- Responsive Vorschau bei 390 und 1024 px: Eingabe und Ergebnisse bedienbar, keine horizontale Überbreite des Dokuments; breite Tabellen bleiben innerhalb ihres Containers scrollbar. Dies ist eine Chromium-Breitenprüfung, kein Test auf einem physischen iPad/Safari.
- Öffentliche Uniway-Seite und Produktdemo geprüft; Beispielwerte stimmen mit dem Werkzeug überein.

## Veröffentlichung

Keine Datenbankmigration erforderlich. Nach dem Merge den aktuellen `main` auf Infomaniak abrufen und die Node.js-Anwendung neu starten. Konten mit einzelnen Werkzeugfreigaben erhalten Uniway über die bestehende Berechtigungsverwaltung; umfassende Werkstatt-Freigaben gelten wie bisher für die Werkstatt-Werkzeuge.
