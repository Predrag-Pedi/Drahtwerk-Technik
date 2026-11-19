# CAD: Zeichenabläufe aus den Videos

Stand: 17.11.2026. Grundlage sind die drei vom Nutzer bereitgestellten Videos. Die Funktionen sind eigenständig im vorhandenen Editor umgesetzt.

| Beobachtung | Umsetzung |
| --- | --- |
| TinLine Schema, ca. 0:00–0:50: Projektdaten und Standardblätter | Bereits vorhanden; weiterverwendet |
| Ca. 1:00–1:48: Makros einsetzen, Vorschau, Ausrichten, Anschliessen | Vorhandene Vorschau und Auto-Anschluss weiterverwendet |
| Ca. 1:50–2:20: Klemmenassistent | Nummerierte Klemmengruppen mit Beschriftungen, optionalem Anschluss an native Symbole, Bearbeitung und Kollisionsprüfung |
| Ca. 2:28–2:50: Querverweise | Vorhandene Zuordnung und gegenseitige Navigation weiterverwendet |
| Ca. 2:52–3:32: intelligente Kontakte und Belegung | Konfigurierbare Schliesser, Öffner und Wechsler, freie/belegte Kontakte, Funktionstexte, direkte Platzierung und Prüfung auf doppelte Anschlüsse |
| Ca. 3:40–4:20: Aktorkanäle | Manuell konfigurierte Kontakte je Gerätefunktion; keine automatische Hersteller- oder ETS-Kanaldatenübernahme |
| Ca. 4:36–5:10: Auswertungen | CSV für Excel: Geräte, Klemmen, Kontakte und Messvorlage mit leeren Prüffeldern |
| Ca. 5:16–6:10: Druckassistent | Seitenauswahl, PDF-Lesezeichen, enthaltene Querverweise |
| Eigene Aufzeichnung 14:15: Platte fällt unter den Rahmen | Einfügepunkt wählbar, standardmässig unten links; Objektfang begrenzt passende Teile im Rahmen |
| Eigene Aufzeichnung 14:26: Rahmen, Masse und aneinander gesetzte Platten | Vorhandene Rahmen-/Masswerkzeuge ergänzt um Einfügepunkte und SBR-Innenkanten |

## Massstab

Neue Dispo-Seiten bleiben standardmässig bei 1:10. Der Wechsel zwischen Smissline und konventionellem Aufbau verändert den gewählten Massstab nicht. Ein bewusst gewählter anderer Massstab transformiert die komplette Anordnung gemeinsam. Physische Abmessungen und Masswerte bleiben erhalten. Bestehende Projekte werden beim Öffnen nicht ungefragt umgestellt.

## Prüfung

Automatisierte Regressionen decken Einfügeecken und Drehung, zwei 500-mm-Platten im 1008-mm-Rahmen bei 1:5 und 1:10, Massstabwechsel, Kontaktbelegung, Kopien, Klemmenverbindungen, Projektsicherungen, CSV und PDF-Lesezeichen ab. Browserprüfung: Öffner konfigurieren/platzieren, belegten Anschluss anzeigen, Klemme automatisch verbinden, zwei 3er-Platten innen aneinander setzen, 1:10 → 1:5 → 1:10, JSON sichern, Klemmen-CSV und ausgewählte Schema-PDF herunterladen. Die PDF wurde mit einem unabhängigen Parser auf zwei ausgewählte Seiten, zwei Lesezeichen und gegenseitige Linkziele geprüft.

Die vollständige Testausführung weist einen bereits auf dem Ausgangsstand vorhandenen Fehler in `tests/assets.test.mjs` aus: Die Wärmeberechnung erwartet für `app.mjs` dieselbe Versionsnummer wie `workspace.mjs`, obwohl der Service Worker unterschiedliche Versionen führt. Diese fachfremden Dateien bleiben unverändert.

## Grenzen

Die neuen Assistenten ergänzen die vorhandenen Zeichenfunktionen; sie ersetzen keine vollständige TinLine-Installation. Keine automatische Kontaktbestückung aus Herstellerartikeln, kein ETS-Import, keine XLSX-Ausgabe, keine elektrische Prüfung, keine assoziative Bemassung und kein automatisches Auftrennen bestehender Leitungen durch eingesetzte Geräte. Bereits in Originalmakros eingebettete Klemmen werden nicht in native Klemmengruppen umgewandelt. PDF-Zeichnungsseiten bleiben gerastert, SVG bleibt vektorbasiert.

## Makros in der linken Seitenleiste (19.11.2026)

Die vorhandene Bibliothek bleibt die Quelle. Schema-Makros werden im Bereich «Makros / Vorlagen» ausgewählt und direkt dort konfiguriert. Originaltexte wie Strom, Charakteristik, Fehlerstrom, Kabel und Querschnitt sind vor der Platzierung editierbar; weitere Texte liegen in einem aufklappbaren Abschnitt. Jede Einfügung erhält eigene Textwerte, verwendet die vorhandenen automatischen Kennzeichen und bleibt mit den bisherigen Bearbeitungs- und Exportfunktionen kompatibel.

Pfadtasten 0–9 richten die erste Gerätefunktion auf den gewählten Pfad aus. Die Zeichnung wird nicht verkleinert, der Seitenmassstab nicht geändert. Zu grosse Makros und Überschneidungen mit vorhandenen Vorlagen werden gemeldet; die freie Mausplatzierung bleibt verfügbar. Die Auswahl bleibt nach Einfügen, Rückgängig und Werkzeugwechsel in der Seitenleiste. Es öffnet sich kein Makrodialog. «Vorlage wechseln» führt direkt zur Suche.

Die Umstellung betrifft die Bedienung der integrierten Zeichnungen. Eingebettete Abgangsklemmen bleiben in ihrer Originalgeometrie; eine echte Umschaltung oben/unten ist damit noch nicht umgesetzt. Keine automatische Prüfung, ob ein geänderter Nennstrom zum gewählten Kabelquerschnitt passt.

Validierung: 415 CAD-Tests bestanden, darunter neue Prüfungen für Pfadzuordnung, vollständige LS-/WZU-Makros, getrennte Werte je Einfügung, Speichern/Import/Kopie, SVG, Blattgrenzen und kollisionsfreie Platzierung. Browserprüfung mit LS-Abgängen auf Pfad 2/4 (25 A und 63 A), Zähler/WZU auf Pfad 7, Rückgängig/Wiederholen, Kollisionsmeldung und freie Mausplatzierung mit 40 A auf Pfad 0.
