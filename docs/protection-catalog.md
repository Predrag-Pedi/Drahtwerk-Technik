# Artikelgebundene Schutzgeräte im Schema

Stand: 19. November 2026. Die Auswahl enthält 610 konkrete Artikel; sie ist kein vollständiges Marktverzeichnis und keine Live-Verfügbarkeitsabfrage.

| Hersteller | LS | FI/LS | FI | Quelle |
| --- | ---: | ---: | ---: | --- |
| Hager Schweiz | 301 | 88 | 51 | Energieverteilung I, Ausgabe Mai 2026 |
| Schneider / Feller | 80 | 52 | 38 | Schweizer Online-Katalog, Bereich Clario / Fehlerstromschutz |

## Quellen und Reproduktion

- [Hager Schweiz, Energieverteilung I, Mai 2026](https://assets.sc.hager.com/de-ch/-/media/project/hagerdeep/switzerland/hager/b2b-ch/pdf/kataloge_2605/hager_kat3_energieverteilung-i_d_2026-05.pdf?la=de-ch). Jeder Datensatz nennt die PDF-Seite. Die Artikel stammen aus tatsächlich aufgeführten Tabellenzeilen; Artikelnummern werden nicht aus Zahlenbereichen zusammengesetzt.
- [Feller / Schneider Online-Katalog](https://online-katalog.feller.ch/de/products?levels=10220). Die öffentlich abrufbaren Produktdaten liefern Artikelnummer, ELDAS und technische Merkmale. Ausgelistete Artikel mit Nachfolger bzw. ohne Bestellfreigabe wurden ausgeschlossen. `https://online-katalog.feller.ch/products/{Artikelnummer}?lng=de` liefert die öffentliche Produktantwort; der Generator erwartet deren Produktobjekt (unter `data.product`) als einzelne JSON-Datei. Technische Merkmale haben Vorrang gegenüber verkürzten Artikeltiteln: beispielsweise A9R31480 = 80 A.

```sh
python tools/build-protection-catalog.py /tmp/hager-protection.pdf /tmp/feller-details
node --test tests/cad-protection-catalog.test.mjs
```

Der Generator benötigt PyMuPDF und schreibt `cad/protection-articles.mjs`. PDF-Dateien und rohe Produktantworten werden nicht im Repository gespeichert. Bei einer Aktualisierung das Prüfdatum im Generator anpassen und die Referenztests sowie einen Vergleich der Artikeländerungen durchführen. Bestehende Artikel-IDs bleiben für gespeicherte Projekte erforderlich; entfernte Artikel müssen gegebenenfalls als Bestandsartikel erhalten bleiben.

## Verhalten

- Die Geometrie bestimmt Geräteart und Polausführung. `3P+N` mit drei geschützten Polen wird nicht mit einem vierpolig geschützten Gerät gleichgesetzt. Bei FI ohne Überstromschutz gelten `1P+N`/`2P` und `3P+N`/`4P` als entsprechende Darstellungen.
- Hersteller, Baureihe und konkrete Artikel bestimmen die angebotenen Werte. Ein Klick wählt immer einen vollständigen vorhandenen Artikel. Falls dafür weitere Werte wechseln müssen, nennt die Statusmeldung diese Änderungen. Beispiel: Hager ACA913C, C13/10 mA, wird bei Wahl von 16 A zu ADA916C, C16/30 mA.
- Bemessungsstrom, Charakteristik, Fehlerstrom, Fehlerstromtyp und vorhandene Spannungs-/Typfelder werden gemeinsam in die Zeichnung übernommen. Artikelnummer und weitere Merkmale bleiben über die Gerätefunktion mit dem Artikel verbunden; sie erscheinen auch in der Geräteliste. Unter „Weitere Artikelwerte“ stehen Baureihe, konkrete Artikelwahl, Schaltvermögen und zusätzliche belegte Merkmale sowie die Herstellerquelle.
- Icn, Icu und bedingter Kurzschlussstrom Inc sind getrennte Angaben. Spannungs- und Normbezüge der Schneider-Schaltvermögen bleiben in den Detailangaben erhalten. Hager-Inc-Angaben benötigen die im Katalog beschriebene Vorsicherung. Unklare Abmessungen und nicht belegte Merkmale werden weggelassen; insbesondere werden Verpackungsmasse nicht als Gerätegeometrie verwendet.
- Die Kabelautomatik im Einfügebereich verwendet weiterhin die vorgegebene Drahtwerk-Tabelle. Manuelle Kabeltexte bleiben unabhängig; Klemmen beginnen bei 2,5 mm². Die Artikelwahl ersetzt keine Kabelberechnung. Bei einem späteren Artikelwechsel am bereits eingesetzten Gerät bleibt der vorhandene Kabeltext erhalten.
- BMK und Abgangnamen bleiben frei bearbeitbar. Artikelgebundene Texte werden über die Artikelwahl geändert, damit einzelne Textänderungen keine fiktiven Kombinationen erzeugen.
- Bestehende Projekte werden nicht automatisch auf andere Artikel umgestellt. Neue Vorlagenentwürfe übernehmen nur einen Artikel, wenn die vorhandenen Werte passen oder ausdrücklich Platzhalter sind. Nicht zuordenbare Geräte benötigen vor dem Einsetzen eine Artikelauswahl. Für bislang nicht hinterlegte Polausführungen erscheint ein Hinweis.

## Abdeckung und Grenzen

Die Prüfung der gesamten Schema-Bibliothek erkennt 131 Schutzgerätefunktionen in 116 Vorlagen; 125 erhalten zu ihren Ausgangswerten einen Artikel. Sechs 2P+N-LS-Vorlagen haben im aktuellen Sortiment keinen passenden Artikel und bleiben für das Einsetzen gesperrt. Gemischte Vorlagen (WZU, NA-Schutz, Dämmerungsschalter, Digitalstrom) ordnen die Werte dem jeweiligen Gerät zu, nicht benachbarten Relais oder Spannungsversorgungen.

Die Funktion gilt für erkannte Schutzgeräte in Schema-Vorlagen und Makros. Freie Zeichnungstexte und die älteren eingebauten Grundsymbole sind kein vollständiges Herstellerartikelsystem. Dispositionsvarianten verwenden weiterhin ihre bestehenden Planungshüllen und Hersteller-/Systemlogik; die Artikelwahl erzeugt keine neuen massgetreuen 3D-Modelle und weist einer später umgebauten Disposition nicht stillschweigend eine alte Artikelnummer zu. Weitere Hersteller und Reihen können als belegte Artikeldatensätze ergänzt werden.
