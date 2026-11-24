# Firmenvorlagen auf mehreren Tablets

## Ausgangspunkt und Grenze der Diagnose

PR #179 ist in `main` enthalten. Die öffentlich ausgelieferten Dateien
`platform/client.mjs`, `workshop-model.mjs`, `workshop-editor.mjs`,
`workshop-rails.mjs` und `shell.mjs` auf schaltbase.ch entsprachen beim Prüfen
diesem Stand. Kein Zugriff auf produktive Konten oder Datenbank.

Die genaue Browser-/Tabletversion des betroffenen Geräts ist noch unbekannt.
Zwei Fehler wurden in einer isolierten Vorschau reproduziert:

- Ohne `structuredClone` blieb die Zuschnittliste leer; nur die Browserkonsole
  meldete einen Fehler. Der Link zur Firmenbearbeitung blieb sichtbar.
- Bei einer leeren `profiles`-Antwort warf das Rendern des Editors einen Fehler
  ausserhalb seines `try/catch`. Die Anzeige blieb bei „Werkstattvorlage wird
  geladen …“ stehen. Eine nicht antwortende Anfrage hatte ebenfalls kein Zeitlimit.

Das belegt diese Fehlerpfade, aber noch nicht den konkreten Auslöser auf dem
Tablet des Benutzers. Leere oder beschädigte produktive Vorlagen wurden nicht
festgestellt und werden nicht automatisch mit Standards überschrieben.

## Änderung

Werkstattvorlagen bestehen aus JSON-Daten und werden ohne die neuere
`structuredClone`-API kopiert. Neue Eintrags-IDs verwenden bei fehlendem
`crypto.randomUUID` weiterhin kryptografischen Zufall über `getRandomValues`.
Die gemeinsame Werkzeugzuordnung benötigt kein `Object.hasOwn` mehr.

Vorlagenabrufe werden nach 15 Sekunden einschliesslich Antwortkörper abgebrochen.
Netzwerk-, Antwortformat- und Darstellungsfehler führen zu einer sichtbaren
Meldung mit „Erneut laden“. Beim Verlassen des Editors werden laufende Leseabrufe
abgebrochen. Schreibvorgänge werden nicht automatisch wiederholt. Firmen- und
Benutzerzuordnung, CSRF, Berechtigungen und Revisionsprüfung bleiben erhalten.

## Prüfung

- `npm test`: 690 Tests bestanden. Nach Ergänzung des separaten Client-/Sitzungstests
  nochmals alle 8 Tests in `tests/platform-workshop-client.test.mjs` bestanden.
- Ein zweiter Sitzungstoken desselben Mitarbeiters liest dieselben gespeicherten
  Tiefen und Abzüge, kann mit Schreibrecht ändern, und andere Mitarbeitende sehen
  die neue Revision. Veraltete Schreibversuche werden mit 409 abgewiesen.
- In der Browser-Vorschau wurden `structuredClone`, `crypto.randomUUID` und
  `Object.hasOwn` ausschliesslich auf der Clientseite deaktiviert. Als Mitarbeiter
  110-mm-Profil angelegt, Testschiene mit 22-mm-Abzug gespeichert. Ein zweites
  Mitarbeiterkonto sah die Firmenvorlage und berechnete bei 800 mm Breite 778 mm.
- Eine absichtlich unvollständige Antwort zeigt nun eine Fehlermeldung. Eine
  absichtlich nicht beantwortete Anfrage endet mit Hinweis auf die Verbindung
  und erneutem Laden. Keine Änderungen an produktiven Daten.
- JavaScript-Syntax und `git diff --check` erfolgreich. Keine Prüfung auf einem
  physischen iPad; die Browserfunktionen wurden in Chrome gezielt deaktiviert.

## Bereitstellung

Nach dem Merge im Infomaniak-Terminal:

```sh
git -C /srv/customer/sites/schaltbase.ch pull --ff-only origin main
```

Danach die Node.js-Anwendung im Infomaniak-Dashboard neu starten und die Seite
auf beiden Tablets neu laden. Keine Datenbankmigration und kein erneutes
`admin:init` erforderlich. Anschliessend dieselbe Firma und Tiefe auf beiden
Geräten vergleichen.
