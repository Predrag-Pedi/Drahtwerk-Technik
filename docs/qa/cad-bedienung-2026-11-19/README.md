# Makrosuche und direkte Textbearbeitung – 19.11.2026

Ausgangsbasis: main nach PR #169 (`2eec6c0ef4ae8f19dc4b532307145fde029a2857`).
Geprüft im lokalen Browser am eigenen Testprojekt «Makros – Seitenleiste prüfen»,
1363 × 938 px, Bibliotheksbreite 320 px.

## Beobachtung vor der Änderung

Die gesamte linke Spalte scrollte zusammen: Filter, Makroeinstellungen und Treffer.
Beim FI/LS-Makro hatte sie 1412 px Inhalt bei 852 px verfügbarer Höhe; nach Auswahl
stand sie auf Scrollposition 373. Suche und «Vorlage wechseln» waren dadurch
oberhalb des sichtbaren Bereichs. Die Stromwandlermessung hatte 4 Hauptwerte und
28 zusätzliche Texte; WZU Contactless hat 7 Hauptwerte und 67 weitere Texte.
Textziele für Doppelklick fehlten in der normalen Gruppenauswahl vollständig.

## Änderung

- Suche bleibt sichtbar. Darunter entweder kompakte Treffer oder die ausgewählte
  Vorlage. «Zur Trefferliste» erhält Suche, Filter und Position; «Zur Vorlage»
  führt direkt zum Entwurf zurück.
- Schema-Makros sind getrennt von allen Schema-Vorlagen und Dispo-Vorlagen
  auswählbar. Fachbereich, Hersteller und Gruppe liegen hinter «Filter» mit
  sichtbarer Anzahl aktiver Filter; alle Originalvorlagen bleiben erreichbar.
- Suche toleriert technische Trennzeichen und Umlautschreibweisen, z. B.
  FI/LS, FI_LS, FILS sowie Zähler/Zaehler und Schrank/Schränke. Treffer im Namen
  werden vor Treffern nur im Ordnerpfad angezeigt.
- Zusatztexte sind gezielt durchsuchbar. Die Auswahl von Strompfad oder freier
  Platzierung bleibt unten sichtbar. Entwürfe (Werte, Balkenseite, Symbolgrösse)
  bleiben beim Vorlagenwechsel im geöffneten Projekt erhalten; kein dauerhaftes
  Speichern dieser Einfügeentwürfe über Neuladen hinweg.
- Doppelklick auf BMK/Vorlagentext, freien Text und native Gerätebeschriftungen
  öffnet die Bearbeitung in der rechten Eigenschaftenspalte. Übernehmen,
  Abbrechen, Esc, Strg/Cmd+Enter und Original/Automatik sind verfügbar.
- Normales Ziehen bleibt eine Gruppenbewegung. Einzelteilmodus bleibt verfügbar.
  Änderungen am BMK eines zugeordneten Kontaktes betreffen dessen Schütz und
  Kontakte gemeinsam; der Editor erklärt dies ausdrücklich.

## Browserprüfung

| Fall | Ergebnis |
| --- | --- |
| LS 403, FI/LS 501 | Hauptwerte und Einfügeknöpfe ohne Scrollen erreichbar; linke Spalte 852/852 px |
| Suche FI/LS | 19 Makrotreffer, kompakte Zeilen mit Vorschaubild |
| Stromwandlermessung 245 | 28 Zusatztexte; Suche «Boiler» zeigt genau Nacht- und Tagfreigabe |
| WZU Contactless | 67 Zusatztexte; manuelles Einfügen erst nach ausdrücklichem Einpassen auf 96 % möglich |
| Digitalstrom 1010 | Vorlagenwechsel und Rückkehr zur vorherigen Stelle in langer Trefferliste |
| Favoriten | FI/LS merken, unter Favoriten finden und wieder entfernen |
| Zuletzt | Zuletzt gewählte Digitalstrom- und FI/LS-Vorlagen erscheinen zuerst |
| Entwurf | FI/LS auf 20 A/Balken unten einstellen, Stromwandler öffnen, zurückwechseln: Werte erhalten |
| Pfadplatzierung | FI/LS mit 20 A auf Pfad 0 erzeugt 11F0; 4 Elemente/16 Autoanschlüsse; Undo wieder 3/12 |
| Hager F_954_068_600x1800 | Herstellerfilter, Auswahl und Platzierung auf Dispo; Massstab unverändert 1:10; Undo |
| BMK-Doppelklick | 11F2 → 11F2_TEST; Darstellung geändert; Undo stellt 11F2 wieder her |
| Vorlagentext-Doppelklick | 25 A → 32 A per Strg+Enter; nach Neuladen erhalten; Original wiederhergestellt |
| Gruppenbewegung | Ziehen am BMK verschiebt das gesamte Makro um 20 Zeichnungseinheiten; kein Texteditor; Undo |
| Abbrechen | Esc schliesst den direkten Texteditor ohne Änderung |

Screenshots: [Suche](../../screenshots/cad-vorlagen-suche.jpg),
[Makro und Direktbearbeitung](../../screenshots/cad-makro-direktbearbeitung.jpg).

## Automatische Prüfung und Grenzen

`node --test tests/cad*.test.mjs`: **424/424 bestanden**.
Nach abschliessender Suchnormalisierung: 12/12 gezielte Tests für Suche,
Textbearbeitung und Doppelklick erneut bestanden. `git diff --check` ohne Fehler.

Neue Regressionen prüfen BMK-/Text-Persistenz, Original/Automatik, Kontakte,
Längenbegrenzungen, Suchvarianten, Makrofilter und Rangfolge. Bestehende
Auswahltests prüfen weiterhin Ganzobjekte und den Ausschluss von Editor-Hilfen
im Export; Text-Hitflächen sind nun auch bei Gruppenauswahl vorhanden.

Dies ist eine Bedien- und Softwareprüfung ausgewählter Vorlagen, keine erneute
fachliche Abnahme sämtlicher Stromkreise. Die strukturelle Prüfung aller 4291
Vorlagen ist separat in `../cad-vorlagen-2026-11-19/` dokumentiert. Smartphone-
und iPad-Abmessungen wurden in diesem Durchlauf nicht separat im Browser geprüft.
