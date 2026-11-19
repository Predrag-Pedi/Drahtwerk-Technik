# Klemmenkennzeichnung und Vorlagenprüfung – 19.11.2026

Die Videoaufnahme zeigt eine unveränderte Klemmentabelle. Nur ein schwarzer Balken an ihrer Ober- bzw. Unterkante kennzeichnet die physische Einbaulage. Die neue Auswahl in der linken Makroseitenleiste und in den Elementeigenschaften setzt genau diese Darstellung um. Bestehende Markierungsbalken werden ersetzt; Klemmen, Leitungen, Anschlusskoordinaten und Kennzeichen bleiben unverändert. «Aus Vorlage» stellt die ursprüngliche Darstellung wieder her.

## Vollständige technische Prüfung

Reproduzierbarer Aufruf aus dem Repository: `node tools/tinline/audit-catalog.mjs /tmp/cad-template-audit --raster`. Für die optionale Rasterprüfung muss `sharp` über `CODEX_PRIMARY_RUNTIME_NODE_MODULES` oder `node_modules` erreichbar sein. Die Prüfung ohne Raster benötigt nur Node.js.

| Prüfung | Ergebnis |
|---|---:|
| Katalogeinträge, sichere SVG-Daten, übereinstimmende Kategorien und Masse | 4’291 / 4’291 |
| SVG vollständig gerendert und nicht leer | 4’291 / 4’291 |
| Platzierung im Zeichenbereich, inklusive Randpositionen und passenden Drehungen | 4’291 / 4’291 |
| Schema-Makros mit mindestens einem zulässigen Strompfad | 106 / 106 |
| Vorlagen ohne erforderliche Einpassung bei Schema 100 % / Dispo 1:10 | 4’201 |
| Schema-Grafiken mit ausdrücklich wählbarer Verkleinerung | 81 |
| Dispo-Vorlagen mit ausdrücklich wählbarem grösserem Massstabsnenner | 9 |
| Klemmentabellen mit umschaltbarem Balken | 113 in 83 Vorlagen |
| CAD-Regressionstests | 419 bestanden |

Einzelresultate inklusive Originalmassen, vorgeschlagener Symbolgrösse, Blattmassstab und verfügbaren Strompfaden stehen in [templates.csv](templates.csv); die Zusammenfassung steht in [summary.json](summary.json).

## Korrigierte Befunde

- Rundungsabweichungen an der Blattgrenze verhinderten die Platzierung von fünf ansonsten passenden Vorlagen. Die Grenzprüfung toleriert jetzt numerisches Rauschen bis 0.000001 Zeichnungseinheiten.
- 16 physische Aufbauzeichnungen aus `181-Diverse-Symbole/50Schaltschrank` waren als Schema katalogisiert. Sie gehören nun zur Dispo, inklusive korrekter Kategorie im Importgenerator. Ihre Millimetermasse sind unverändert. Bereits gespeicherte Zeichnungen werden nicht nachträglich umklassifiziert.
- Grosse Grafiken lassen sich jetzt direkt in der Seitenleiste ausdrücklich einpassen. Nicht passende oder belegte Strompfade sind deaktiviert und begründet. Bei Aufbauzeichnungen wird ein passender Blattmassstab angeboten; Bauteilmasse werden nicht verkleinert.
- 113 Tabellen wurden aus den Originalvektoren ermittelt und als Ausschnittübersichten visuell geprüft. Bereits vorhandene schwarze Markierungsrechtecke werden beim Umschalten entfernt. Die vier Makros ohne solche Tabelle (Reserveplatz 3 und drei Stromwandlermessungen) erhalten keine erfundene Tabelle.

## Browser und PDF

Im lokalen CAD getestet: LS auf Pfad 2 mit Balken oben und Pfad 4 mit Balken unten, WZU-Zählermakro von Hand mit Balken oben, nachträgliches Umschalten ohne Positionsänderung, Rückgängig/Wiederholen und erneutes Öffnen. Das breite WZU-Contactless-Makro wurde über die Seitenleiste mit 96 % auf einem freien Blatt eingesetzt. Die Aufbauvorlage UP_Modell_24_TT zeigte zunächst 1:10; erst ein ausdrücklicher Klick änderte das Blatt auf 1:15, bei unveränderten 1689.4 × 2627.9 mm.

Der echte Browser-PDF-Download der Testseite wurde geöffnet und als A3 quer (420 × 297 mm) geprüft: beide Balkenpositionen und das WZU-Makro sind vollständig enthalten. [Browseransicht](../../screenshots/cad-klemmenkennzeichnung.jpg).

Die Gesamtprüfung deckt Laden, Darstellen, geometrisches Einsetzen und die hier ergänzte Kennzeichnung ab. Sie ist keine elektrotechnische Prüfung sämtlicher Schaltungen oder Herstellerangaben. Lange, nachträglich eingegebene Freitexte und beliebige Kombinationen mehrerer Makros auf einem Blatt benötigen weiterhin eine Sichtkontrolle.
