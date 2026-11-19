# Prüfung der artikelgebundenen Makroauswahl

## Automatisierte Prüfung

`node --test tests/cad-*.test.mjs`

433 Tests erfolgreich, einschliesslich sieben neuer Artikeltests:

- Eindeutige Artikel-IDs und belegte Merkmalskombinationen; FI, FI/LS und LS getrennt.
- 3P+N und vier geschützte Pole werden nicht gleichgesetzt.
- Gemeinsamer Wechsel von Strom, Charakteristik, Fehlerstrom und Typ; manuelle Kabelwerte bleiben erhalten.
- Gemischte Vorlagen WZU, NA-Schutz, Dämmerungsschalter und Digitalstrom: geräteeigene Polzahl, keine Übernahme benachbarter Steuerspannungen.
- FI-Platzhalter werden befüllt und nicht als FI/LS oder Schmelzsicherung ausgewertet.
- Einsetzen, Sichern/Import, Kopieren, Geräteliste und Dispositionsextraktion erhalten Artikelidentität und Merkmale; widersprechende direkte Textänderungen werden verhindert.
- Prüfung aller ursprünglichen Makros ohne erfundene Artikelzuordnung.

Zusätzlicher Bibliotheksdurchlauf: 116 Schema-Vorlagen mit 131 Schutzgerätefunktionen; 125 zuordenbar, sechs 2P+N-LS-Funktionen ohne hinterlegten passenden Artikel.

## Browserprüfung

Lokale Vorschau bei 1363 × 938 px, bestehendes Testprojekt „Makros – Seitenleiste prüfen“:

1. FI/LS L1NPE: Schneider Clario mit 6–40 A, B/C, 30 mA, A/A-SI; keine generische 63-A- oder D-Auswahl.
2. Herstellerwechsel zu Hager: vorhandene 6–20-A-, 10/30/300-mA- und A/A-HI-Varianten.
3. ACA913C (C13/10 mA) auf 16 A geändert: ADA916C (C16/30 mA), beide Änderungen in Statusmeldung, Kabel automatisch 3×2,5 mm².
4. Abgangname erfasst und auf freien Pfad 8 eingesetzt. Rechts Artikel auf ADA920C geändert; bestehender Kabeltext und Abgangname erhalten. Nach Neuladen bleibt die Zuordnung bestehen.
5. FI 1LN: eigene 16/25/40/63/125-A-Auswahl, Fehlerstrom/Typ, keine LS-Charakteristik; Platzhalter mit CDA225C befüllt.
6. LS 3LNPE: D-Charakteristik gewählt, A9P64713 mit getrennten 6-kA-Icn- und 10-kA-Icu-Werten. Weitere Artikelwerte zeigen Baureihe, Artikel und Quellenlink.
7. Kompakte Auswahlfelder sowohl links als auch rechts visuell geprüft; zu schmale Felder und grosse Standard-Schaltflächen im rechten Inspector korrigiert.

Service-Worker-Version 182 und CAD-Modulversion 20261119-6 enthalten auch die vier neuen Module. Keine Videos, Kundenprojekte, Hersteller-PDFs oder Browserbilder werden mit dieser Änderung veröffentlicht.
