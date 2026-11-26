# Homepage: Aufträge und Lager

Die öffentliche Homepage zeigt den Ablauf von der genehmigten Offerte über den Auftrag bis zur Lagerbuchung. Zwei neue Detailseiten sind im gemeinsamen Werkzeugmenü und automatisch in der Sitemap enthalten. Die Wärmeberechnung wird in der öffentlichen Navigation und auf der Homepage nicht mehr beworben; die bestehende Anwendung und ihre Rechte bleiben erhalten.

## Beispiele

- AN-00104: 6 Leitungsschutzschalter à CHF 29, 6 m Schienen à CHF 5 und 2 h Montage à CHF 95 ergeben CHF 394 exkl. MwSt.
- AU-00028: Die ursprüngliche Offerte bleibt erhalten. Die Auftragserstellung bucht 6 von 24 Leitungsschutzschaltern ab; 18 bleiben im Bestand.
- Kundenmaterial: 0/2, Teillieferung 1/2, vollständige Lieferung 2/2; ausstehend rot, vollständig grün.
- Lager: optionaler Lagerplatz, Katalog oder manuelle Erfassung, separate Fehlmengenanzeige.
- Zuschnitt: 4 × 1500 mm mit 3 mm Schnittbreite auf zwei 6000-mm-Stangen. Reste 1491 und 4497 mm, Schnittverlust insgesamt 12 mm.

Die Vorführungen verwenden ausschliesslich fiktive Daten und rufen keine Firmen-APIs auf. Sie zeigen illustrative Bedienansichten, keine Kundenprojekte oder Bildschirmaufnahmen. Keine Reservierung beim Offerieren, keine Abbuchung allein durch Genehmigung und kein automatischer E-Mail-Versand werden versprochen.

## Prüfung

- Gesamtsuite: 781 Tests bestanden.
- Anschliessend erweiterte Routing-/SEO-/Zugriffsprüfungen: 15 Tests bestanden. Neue Produktseiten und Demo-Assets sind öffentlich erreichbar; Auftrags- und Lageranwendung verlangen weiterhin die Anmeldung.
- Browser: alle neun Szenen der neuen Hauptclips auf Desktop durchgeklickt; kein innerer Überlauf. Autoplay läuft, Pause und Schrittauswahl funktionieren; Tastaturwechsel Schema → Dispo geprüft.
- Responsive Vorschau: 390 und 768 px breit. Kein horizontaler Seitenüberlauf; Zuschnittgrafik, Produktseiten und Beispielansichten passen. Mobile Schrittauswahl scrollt zum Clip.
- Homepage enthält weder Wärmeberechnungskarte noch entsprechenden Menü-/Verzeichnislink. Bestehende Schema-/Dispo-Vorführungen bleiben erreichbar.
- Generatoren zweimal ausgeführt: identischer HTML-Output. `git diff --check` sauber.

## Pflege

Die Szenen stammen aus `platform/workflow-demo.mjs`, ihre Darstellung aus `platform/workflow-demo.css`. Bei Änderungen an Szenen oder Produktmetadaten die öffentlichen Seiten aktualisieren:

```sh
node tools/build-home-workflow.mjs
node tools/build-product-pages.mjs
```

Keine Migration und keine Änderung am Lager-/Auftragsbackend. Veröffentlichung nach Merge über den bestehenden Infomaniak-Ablauf.
