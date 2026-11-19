# Schutzgeräteauswahl im Schema

Stand: 19. November 2026. Die Auswahl enthält 979 konkrete Artikel; sie ist kein vollständiges Marktverzeichnis und keine Live-Verfügbarkeitsabfrage.

| Hersteller | LS | FI/LS | FI | Quelle |
| --- | ---: | ---: | ---: | --- |
| Hager Schweiz | 313 | 89 | 51 | Energieverteilung I, Ausgabe Mai 2026 |
| Schneider / Feller | 80 | 52 | 64 | Schweizer Online-Katalog, Bereich Clario / Fehlerstromschutz |

| ABB | 198 | 124 | 6 | Niederspannung 2024 und Smissline 10/2024 |
| Eaton | 0 | 1 | 0 | FRBdM 168276, Herstellerseite |
| Siemens | 1 | 0 | 0 | SENTRON 5SY4111-7, Herstellerdatenblatt |

## Quellen und Reproduktion

- [Hager Schweiz, Energieverteilung I, Mai 2026](https://assets.sc.hager.com/de-ch/-/media/project/hagerdeep/switzerland/hager/b2b-ch/pdf/kataloge_2605/hager_kat3_energieverteilung-i_d_2026-05.pdf?la=de-ch). Jeder Datensatz nennt die PDF-Seite. Die Artikel stammen aus tatsächlich aufgeführten Tabellenzeilen; Artikelnummern werden nicht aus Zahlenbereichen zusammengesetzt.
- [Feller / Schneider Online-Katalog](https://online-katalog.feller.ch/de/products?levels=10220). Die öffentlich abrufbaren Produktdaten liefern Artikelnummer, ELDAS und technische Merkmale. Ausgelistete Artikel mit Nachfolger bzw. ohne Bestellfreigabe wurden ausgeschlossen. `https://online-katalog.feller.ch/products/{Artikelnummer}?lng=de` liefert die öffentliche Produktantwort; der Generator erwartet deren Produktobjekt (unter `data.product`) als einzelne JSON-Datei. Technische Merkmale haben Vorrang gegenüber verkürzten Artikeltiteln: beispielsweise A9R31480 = 80 A.

```sh
python tools/build-protection-catalog.py /tmp/hager-protection.pdf /tmp/feller-details /tmp/abb-rcd.pdf
node --test tests/cad-protection-catalog.test.mjs
```

Der Generator benötigt PyMuPDF und schreibt `cad/protection-articles.mjs`. PDF-Dateien und rohe Produktantworten werden nicht im Repository gespeichert. Bei einer Aktualisierung das Prüfdatum im Generator anpassen und die Referenztests sowie einen Vergleich der Artikeländerungen durchführen. Bestehende Artikel-IDs bleiben für gespeicherte Projekte erforderlich; entfernte Artikel müssen gegebenenfalls als Bestandsartikel erhalten bleiben.

Zusätzliche Quellen:
- [ABB Niederspannung 2024, Stand 10/2023](https://library.e.abb.com/public/ef62e714f6fb4ca5b862f90e7cc7913f/Katalog_Niederspannung_2024.pdf): S200 K/Z, PDF-Seiten 28–33; F200 F, Seite 124; DS201 A/M A/M F, Seiten 128–129, 135–136, 139. ABB-Schaltvermögen werden nicht aus einer anderen Strom-/Spannungszeile übertragen.
- [ABB Smissline, Stand 10/2024](https://library.e.abb.com/public/695de79e5c954c679dec7f30efc67ccf/ABB_Teil2_Kap11_Smissline_Stand_10-2024_72dpi.pdf): Kapitel 11/17, 11/19 und 11/20; insbesondere 100 mA und FS403MK Typ F, 3P+N.
- [Eaton FRBdM 168276](https://www.eaton.com/de/de-de/skuPage.168276.html): D16/30 mA, Typ A, 1P+N, 10 kA.
- [Hager AEX466C](https://hager.com/de-ch/katalog/produkt/aex466c-fi-ls-4p-10ka-c-16a-100ma-a): C16/100 mA, Typ A, vier geschützte Pole.
- [Siemens 5SY4111-7](https://support.industry.siemens.com/teddatasheet/?caller=SIOS&format=pdf&language=en&mlfbs=5SY41117): C5, 1P. Kein Ersatz für eine 1P+N-Vorlage.

Einzeln abgeglichene Tabellenzeilen und Herstellerseiten stehen in `tools/protection-supplements.json`; der Generator liest diese mit ein. Alle 610 bisherigen Artikel-IDs bleiben erhalten. Kein vollständiger Markt- oder Lieferbarkeitsnachweis.

## Verhalten

- Die Geometrie bestimmt Geräteart und Polausführung. `3P+N` mit drei geschützten Polen wird nicht mit einem vierpolig geschützten Gerät gleichgesetzt. Bei FI ohne Überstromschutz gelten `1P+N`/`2P` und `3P+N`/`4P` als entsprechende Darstellungen.
- **„Hersteller festlegen“ ist bei neuen Makros und nach Zurücksetzen ausgeschaltet.** Ohne Haken werden die Werte über Hersteller und Baureihen hinweg angeboten. Ein interner Beleg (`protectionSpecId`) sichert die Kombination; in Zeichnung/Geräteliste wird daraus keine Hersteller- oder Artikelzuweisung. Erst mit Haken erscheinen Hersteller, Baureihe und Artikelwahl. Bereits explizit gebundene Geräte behalten diese Bindung.
- Im neutralen Modus bleiben die Varianten der Geräteart sichtbar. Werte ohne Artikelbeleg für die aktuelle Polausführung sind deaktiviert und erklärt. Mit aktivierter Bindung bestimmen Hersteller, Baureihe und konkrete Artikel die angebotenen Werte. Ein Klick wählt immer einen vollständigen vorhandenen Artikel. Falls dafür weitere Werte wechseln müssen, nennt die Statusmeldung diese Änderungen. Beispiel: Hager ACA913C, C13/10 mA, wird bei Wahl von 16 A zu ADA916C, C16/30 mA.
- Bei aktivierter Herstellerbindung: Bemessungsstrom, Charakteristik, Fehlerstrom, Fehlerstromtyp und vorhandene Spannungs-/Typfelder werden gemeinsam in die Zeichnung übernommen. Artikelnummer und weitere Merkmale bleiben über die Gerätefunktion mit dem Artikel verbunden; sie erscheinen auch in der Geräteliste. Unter „Weitere Artikelwerte“ stehen Baureihe, konkrete Artikelwahl, Schaltvermögen und zusätzliche belegte Merkmale sowie die Herstellerquelle.
- Icn, Icu und bedingter Kurzschlussstrom Inc sind getrennte Angaben. Spannungs- und Normbezüge der Schneider-Schaltvermögen bleiben in den Detailangaben erhalten. Hager-Inc-Angaben benötigen die im Katalog beschriebene Vorsicherung. Unklare Abmessungen und nicht belegte Merkmale werden weggelassen; insbesondere werden Verpackungsmasse nicht als Gerätegeometrie verwendet.
- Die Kabelautomatik im Einfügebereich verwendet weiterhin die vorgegebene Drahtwerk-Tabelle. Manuelle Kabeltexte bleiben unabhängig; Klemmen beginnen bei 2,5 mm². Die Artikelwahl ersetzt keine Kabelberechnung. Bei einem späteren Artikelwechsel am bereits eingesetzten Gerät bleibt der vorhandene Kabeltext erhalten.
- Beim Entfernen der Herstellerbindung werden explizite Artikelnummer und Herstellerzuweisung entfernt; elektrische Werte, Abgangname und manuelle Kabeltexte bleiben erhalten.
- BMK und Abgangnamen bleiben frei bearbeitbar. Artikelgebundene Texte werden über die Artikelwahl geändert, damit einzelne Textänderungen keine fiktiven Kombinationen erzeugen.
- Bestehende Projekte werden nicht automatisch auf andere Artikel umgestellt. Neue Vorlagenentwürfe erhalten nur einen internen Kombinationsbeleg, wenn die vorhandenen Werte passen oder ausdrücklich Platzhalter sind. Nicht zuordenbare Geräte benötigen vor dem Einsetzen eine Artikelauswahl. Für bislang nicht hinterlegte Polausführungen erscheint ein Hinweis.

## Abdeckung und Grenzen

Die Prüfung der gesamten Schema-Bibliothek erkennt 131 Schutzgerätefunktionen in 116 Vorlagen; 125 erhalten zu ihren Ausgangswerten einen Artikel. Sechs 2P+N-LS-Vorlagen haben im aktuellen Sortiment keinen passenden Artikel und bleiben für das Einsetzen gesperrt. Gemischte Vorlagen (WZU, NA-Schutz, Dämmerungsschalter, Digitalstrom) ordnen die Werte dem jeweiligen Gerät zu, nicht benachbarten Relais oder Spannungsversorgungen.

Die Funktion gilt für erkannte Schutzgeräte in Schema-Vorlagen und Makros. Freie Zeichnungstexte und die älteren eingebauten Grundsymbole sind kein vollständiges Herstellerartikelsystem. Dispositionsvarianten verwenden weiterhin ihre bestehenden Planungshüllen und Hersteller-/Systemlogik; die Artikelwahl erzeugt keine neuen massgetreuen 3D-Modelle und weist einer später umgebauten Disposition nicht stillschweigend eine alte Artikelnummer zu. Weitere Hersteller und Reihen können als belegte Artikeldatensätze ergänzt werden.

## Videoabgleich und Vorlagenfamilien

Die drei Videos `LS.mp4`, `FI-LS.mp4` und `FI.mp4` wurden anhand der geöffneten Filterlisten geprüft. Sie zeigen Kategorie-Filter, keine vollständige Liste zulässiger Kombinationen. Die sichtbaren Werte werden deshalb nicht kartesisch kombiniert.

| Video | Sichtbare Merkmale | Umsetzung |
| --- | --- | --- |
| LS | B, C, D, K, Z, E; darunter auch 5 A, 80–125 A | K/Z über ABB S200; E über Hager SLS (eigene Baureihe); 5 A über Siemens, nur 1P belegt |
| FI/LS | 4, 6, 10, 13, 16, 20, 25, 32, 40 A; B/C/D; 10/30/100/300 mA; A/F | Zusätzliche konkrete Artikel von ABB und Eaton; ABB liefert weitere belegte 2-/8-A-Kombinationen |
| FI | 16–125 A; 10/30/100/300/500 mA; A/B/F/A-SI/B+/B-SI/B-EV/A HI | F über ABB; B-SI/B-EV aus den Feller-Produktdetails und dem ausgeschriebenen Herstellertyp; Herstellerzusätze wie B+ hfq und F HI bleiben sichtbar |

Fünf konfigurierte Vorlagenfamilien ersetzen 14 Einträge in der Einfügeliste (9 reine Stromvarianten weniger): LS 3L/N/PE, FI/LS 3L/N/PE und FI/LS L1, L2, L3/N/PE. Nur Stromvarianten sind zusammengefasst. Unterschiedliche Phasen, Polzahlen, überwachte Abgänge und digitalStrom-Funktionen bleiben getrennt. Original-IDs, Dateien und gespeicherte Projekte werden nicht gelöscht oder umgeschrieben; Suche nach alten Stromnamen, Favoriten und zuletzt verwendete Vorlagen werden auf die Familie abgebildet.
