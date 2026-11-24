# Sitzungsstart und leere Schienenvorlagen

## Beobachtung und Grenzen

Gemeldet: Portal bleibt bei «Anmeldung wird geprüft …» stehen; nach Rückkehr ins
Dashboard fehlen Benutzername und Schienenzeilen. Auch ein iPad mit Safari ist
betroffen. Später wurde zusätzlich ein nicht funktionierender Login gemeldet.

Die öffentlichen Produktionsdateien entsprachen bei der Prüfung dem gemergten
Stand von PR 180. `/health` und `/login.html` antworteten mit 200, `/api/session`
ohne Anmeldung erwartungsgemäss mit 401. Es wurden keine Produktionskonten oder
Firmendaten gelesen oder geändert. Der konkrete Fehler auf dem betroffenen Gerät
ist ohne Konsolenmeldung oder authentifizierten Netzwerkverlauf noch nicht belegt.

Im Code ist ein gemeinsamer Fehlerpfad nachgewiesen: `client.mjs` blockiert alle
abhängigen Module mit einer zusätzlichen, bisher unbegrenzten Sitzungsabfrage.
Ein Fehler dort verhindert auch die Fehlerbehandlung in den Werkzeugmodulen.
Zusätzlich wartete die Benutzeroberfläche auf die Service-Worker-Bereinigung.

## Änderung

- Geschützte HTML-Seiten erhalten dieselbe bereits geprüfte Sitzung wie die
  Session-API. Der Client übernimmt sie ohne zusätzliche Netzwerkanfrage.
- JSON wird gegen HTML-Script-Abbruch escaped, nach den textlichen Branding-
  Ersetzungen eingesetzt und nicht auf öffentlichen Seiten eingebettet.
- Cookie bleibt HttpOnly; alle API-Zugriffe prüfen weiterhin Sitzung, Firma,
  Lizenz und Schreibrechte auf dem Server. HTML bleibt `Cache-Control: no-store`.
- Session-Fallback und Aktualisierung, Login sowie Verwaltungsabfragen haben
  eine Zeitgrenze von 15 Sekunden. Fehlgeschlagene Schreibanfragen werden nicht
  automatisch wiederholt.
- Sitzungs- und Modul-Ladefehler erhalten einen sichtbaren Fehlerbildschirm mit
  erneutem Laden. Fehlerhafte Seiten bleiben im DOM, werden aber inaktiv gesetzt.
- Offline-Bereinigung blockiert die Benutzeranzeige nicht mehr.

## Prüfung

- `npm test`: 699 Tests erfolgreich, inklusive Session-Bootstrap, Firmenisolation,
  HTML-Escaping, verweigerten Zugriffen und Zeitüberschreitung.
- Lokale Browserprüfung mit separater SQLite-Datenbank und erfundenen Konten;
  keine produktiven Zugangsdaten.
- Dauerhaft blockierte `/api/session`-Antwort: Mitarbeiter mit ausschliesslichem
  Schienen-Schreibrecht sieht 15 Schienen und seinen Namen, bearbeitet den
  Seitenprofil-Abzug von 40 auf 43 mm und speichert als Firmenvorlage.
- Wechsel Vorlage → Dashboard → Schienenrechner: Name bleibt sichtbar; bei
  1000 mm Höhe werden korrekt 957 mm angezeigt. Keine leere Bürogruppe.
- Absichtlich fehlendes Importmodul: sichtbare Meldung statt leerer Liste.
- HTML ohne eingebettete Sitzung und blockierte Session-API: nach 15 Sekunden
  Fehlermeldung mit erneutem Laden. Nach Behebung startet die Seite wieder.
- Dauerhaft blockierte Service-Worker-Bereinigung: Name und Schienen erscheinen.

Die Browserprüfung erfolgte in Chromium. Ein Test auf dem betroffenen iPad und
die Bestätigung des ursprünglichen Auslösers stehen noch aus.

## Installation nach Merge

```sh
git -C /srv/customer/sites/schaltbase.ch pull --ff-only origin main
```

Danach die Node.js-Anwendung im Infomaniak-Dashboard neu starten und die Seite
neu laden. Keine Datenmigration und keine Änderung bestehender Firmenvorlagen.
