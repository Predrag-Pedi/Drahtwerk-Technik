# Herstellerwahl und Makrofamilien – Prüfung 19.11.2026

## Automatisiert

- 437 CAD-Tests erfolgreich (`node --test tests/cad-*.test.mjs`).
- Nach Ergänzung der letzten Artikel und Beschriftungsanpassungen: 17 gezielte Katalog-/Bibliothekstests erneut erfolgreich; Syntaxprüfung von `cad/app.mjs`.
- 979 belegte Artikel (592 LS, 266 FI/LS, 121 FI). Alle 610 bisherigen Artikel-IDs erhalten.
- Neue Tests: neutraler Standardzustand, Herstellerbindung aktivieren/entfernen, keine Artikelnummer im neutralen Gerätebericht, Sicherung/Wiederherstellung der neutralen Konfiguration, Löschen alter SKU-Texte, zusätzliche K/Z/E/D/F/B-SI/B-EV-Varianten sowie aktuelle Polgrenzen.
- Fünf Familien aus 14 Makros: neun Einträge weniger; Strom-Aliase, Favoriten und Zuletzt-Reihenfolge erhalten, Originaldateien unverändert.

## Browser

Geprüft im vorhandenen Testprojekt „Makros – Seitenleiste prüfen“, Seite 12, bei 1363 × 938 Pixeln. Keine Produktionszeichnung bearbeitet.

- Suche nach FI LS L1NPE: nur eine normale Stromfamilie, digitalStrom-Funktionen bleiben separat.
- Suche nach FI LS L1NPE 16A: ein Treffer auf die konfigurierbare Familie.
- Neue Vorlage: Herstellerhaken aus, Hersteller-/Artikelwahl ausgeblendet.
- Typ F gewählt: gültige ABB-Kombination, anschliessendes Aktivieren des Hakens zeigt ABB und passende Baureihe.
- Haken entfernt und D gewählt: gültige D16/30mA/A-Kombination; weitere Änderungen werden in der Statusmeldung genannt, Kabel automatisch 2.5 mm².
- Neutrales Makro mit Abgangname auf Pfad 4 eingesetzt. Nach Neuladen weiterhin neutral, D16/30mA/A und Name erhalten.
- Am eingesetzten Gerät 100 mA gewählt; Umschaltung auf belegte C13/A-Kombination. Haken aktiviert: Artikel 2CCL562120E0134 sichtbar. Haken entfernt: neutral, elektrische Werte und Name erhalten.
- Dreiphasige Familie: Typ F auswählbar, nicht belegte D-/10mA-Polkombinationen deaktiviert. Zurücksetzen stellt den ausgeschalteten Haken wieder her.

## Grenzen

Der Katalog ist eine belegte Auswahl, kein vollständiges Schweizer Marktverzeichnis. Die Videos zeigen Filtermengen, keine Freigabe sämtlicher Kombinationen. Deaktivierte Varianten bedeuten „für diese Polausführung noch nicht belegt“, nicht „existiert grundsätzlich nicht“. Auswahl und Artikelmerkmale betreffen das Schema; automatische Disposition und 3D verwenden weiterhin ihre Planungshüllen.
