// Illustrated public walkthroughs. The drawings are exported by build-home-demos.mjs.
function image(file, description, className = '') {
  return `<img src="platform/demos/${file}" alt="${description}" class="${className}" loading="lazy">`;
}
function drawing(file, description) {
  return `<div class="tour-paper">${image(file, description)}</div>`;
}
function change(before, after, description, action) {
  return `<div class="tour-paper tour-change ${action}">${image(after, description)}${image(before, '', 'tour-before')}<i class="tour-pointer" aria-hidden="true"></i></div>`;
}
function field(label, value, active = false) {
  return `<div class="tour-field${active ? ' tour-selected' : ''}"><small>${label}</small><strong>${value}</strong></div>`;
}
function command(label, interactive = true) {
  return interactive ? `<button type="button" class="tour-command" data-cad-next>${label}</button>` : `<span class="tour-command">${label}</span>`;
}
function editor(context, title, properties, paper) {
  return `<div class="tour-editor"><div class="tour-toolbar"><b>SchaltBase CAD</b><span>${context}</span></div><div class="tour-workspace"><div class="tour-inspector"><h4>${title}</h4>${properties}</div>${paper}</div></div>`;
}

const source = 'schema-source.svg#allgemein';
const variant = 'sbr-variante.svg';
const row = variant + '#zaehlerreihe';
const swapped = 'sbr-getauscht.svg#zaehlerreihe';
const schemaSource = (interactive = false) => editor('Schema · Blatt 10', 'Zähler auswählen',
  field('Betriebsmittel', '10P1', true) + field('Bezeichnung', 'Allgemein') + (interactive ? command('Geräte der Gruppe ansehen') : ''),
  drawing(source, 'Ausschnitt aus Blatt 10 mit dem Zähler 10P1 und seinen Abgängen'));
const assembled = (interactive = false) => editor('Dispo · Varianten vergleichen', 'SBR / Standard · Hager',
  field('Berechneter Aufbau', '758 × 1520 mm') + field('Tiefe', '165 mm') + command('Diese Variante übernehmen', interactive),
  drawing(variant, 'Berechnete Frontansicht mit drei Zählerplätzen, 10P1 links markiert'));
const swap = () => editor('Dispo · Zählerplätze', 'Zählerplätze tauschen',
  field('Auswahl', '10P1 · Allgemein', true) + field('Ziel', 'Platz von 10P4') + '<p>Die beiden Zähler tauschen ihre Position.</p>',
  change(row, swapped, 'Nach dem Tausch liegt E-Mobility links und Allgemein in der Mitte.', 'tour-drag'));

export const cadClips = {
  schema: {
    title: 'Einen LS-Abgang auf Blatt 12 zeichnen',
    description: 'Setze einen zweiten Abgang neben den bestehenden. Das Beispiel zeigt die Eingabe und das Kennzeichen, das beim Platzieren entsteht.',
    steps: [
      ['Makro auswählen', 'Wähle in der Vorlagenbibliothek den dreipoligen LS-Abgang mit N und PE.',
        editor('Schema · Makrobibliothek', 'LS-Abgänge', field('Vorlage', 'LS · 3L/N/PE', true), drawing('macro.svg', 'Originalvorlage mit Leitungsschutzschalter und Anschlussklemmen'))],
      ['Wert und Strompfad wählen', 'Trage 16 A ein. Auf Blatt 12 ist Pfad 2 bereits belegt, Pfad 4 ist frei.',
        editor('Schema · Blatt 12', 'Abgang vorbereiten', field('Bemessungsstrom', '16 A', true) + field('Strompfad', '4'), drawing('schema-1.svg#abgaenge', 'Erster Abgang auf Pfad 2. Der Platz rechts daneben ist frei.'))],
      ['Abgang auf Pfad 4 einsetzen', 'Mit der Pfadwahl setzt SchaltBase das Makro an die richtige Stelle. Der neue LS erhält das Kennzeichen 12F4, die Klemmen 12X4.',
        editor('Schema · Blatt 12', 'Auf Pfad einsetzen', field('Blatt / Pfad', '12 / 4') + field('Neuer LS', '12F4', true) + field('Klemmen', '12X4'), change('schema-1.svg#abgaenge', 'schema-2.svg#abgaenge', 'Zweiter Abgang 12F4 mit 16 A rechts neben 12F2', 'tour-place'))],
    ],
  },
  dispo: {
    title: 'Einen Selbstbaurahmen aufbauen',
    description: 'In der manuellen Dispo legst du die Rahmenmasse fest, platzierst die Platten und ordnest die Geräte an.',
    steps: [
      ['Rahmenmasse eingeben', 'Für diesen Aufbau gibst du 1008 mm Breite, 1520 mm Höhe und 165 mm Tiefe vor.',
        editor('Dispo · Manuelle Eingabe', 'Selbstbaurahmen', field('Feldbreite', '1008 mm') + field('Höhe / Tiefe', '1520 / 165 mm'), drawing('dispo-frame.svg', 'Bemasster Selbstbaurahmen mit Schienen und Kanälen'))],
      ['Zählerplatten einsetzen', 'Platziere die Platten nebeneinander im Rahmen. Der Objektfang hilft beim Ausrichten an der Nachbarkante.',
        editor('Dispo · Bauteile', 'Platten platzieren', field('Bauteil', 'Zählerplatte', true) + field('Ausrichtung', 'Objektfang'), change('dispo-frame.svg', 'dispo-plates.svg', 'Die drei Zählerplatten sind im Rahmen eingesetzt.', 'tour-place'))],
      ['Geräte im Aufbau prüfen', 'Im Beispiel sitzen die LS-Abgänge über den Zählern und die D-Sicherungen darunter. Du kannst die einzelnen Bauteile auf dem Blatt auswählen.',
        editor('Dispo · Frontansicht', 'Bestückung', field('Zählergruppen', 'Allgemein, E-Mobility, Wohnung 1'), change('dispo-plates.svg', 'dispo-complete.svg', 'Bestückter Rahmen mit LS-Abgängen, Zählern und D-Sicherungen', 'tour-place'))],
    ],
  },
  together: {
    title: 'Vom Schema zur Dispo am Beispiel von Zähler 10P1',
    description: 'Verfolge den Zähler «Allgemein» von Blatt 10 bis auf seine Platte. Du siehst, welche Geräte übernommen werden, wie die Software den Aufbau berechnet und wie du ihn anschliessend änderst.',
    steps: [
      ['Zähler im Schema finden', 'Auf Blatt 10 trägt «Allgemein» das Kennzeichen 10P1. Oberhalb siehst du die Sicherung 10F1, darunter die vier LS-Abgänge der Gruppe.', schemaSource(true)],
      ['Zugehörige Geräte erkennen', 'SchaltBase liest Gerätetyp, Kennzeichen und Gruppenzuordnung aus dem Schema. So landen der Zähler und seine Abgänge im selben Aufbau.',
        editor('Schema · Gruppe Allgemein', 'Aus dem Schema', field('Zähler', '10P1 · Allgemein') + field('Vorsicherung', '10F1 · DII') + field('Vier LS-Abgänge', '10F1.2, 10F1.3, 10F2, 10F2.2', true) + command('Einbaumasse / Reserve'), drawing(source, 'Quellschema mit Zähler, vorgeschalteter Sicherung und vier LS-Abgängen'))],
      ['Einbaumasse und Reserve vorgeben', 'Auf der Dispo-Seite öffnest du «Einbaumasse / Reserve». Hier begrenzen 1008 × 1520 mm den verfügbaren Platz. Für die Geräte sind 20 % Platzreserve vorgesehen.',
        editor('Dispo · Einbaumasse / Reserve', 'Vorgaben', field('Max. Breite / Höhe', '1008 / 1520 mm') + field('Geräte-Platzreserve', '20 %', true) + command('Varianten vergleichen'), drawing('schema-source.svg', 'Ausgangslage mit den drei Zählergruppen im Schema'))],
      ['Aufbau berechnen und übernehmen', 'Im Variantenvergleich wählst du «SBR / Standard · Hager». Für die drei Gruppen berechnet das CAD einen 758 mm breiten Rahmen. Mit «Diese Variante übernehmen» wird daraus die bearbeitbare Dispo.', assembled(true)],
      ['Dasselbe Kennzeichen wiederfinden', 'Links steht 10P1 im Schema, rechts sitzt derselbe Zähler auf der ersten Platte. Sein Kennzeichen und die Bezeichnung «Allgemein» bleiben erhalten.',
        `<div class="tour-editor"><div class="tour-toolbar"><b>SchaltBase CAD</b><span>Zuordnung · 10P1</span></div><div class="tour-pair"><figure><figcaption>Schema · Blatt 10</figcaption>${drawing(source, 'Zähler 10P1 im Schema')}</figure><figure><figcaption>Dispo · Zählerreihe</figcaption>${drawing(row, '10P1 auf der linken Zählerplatte')}</figure></div><div class="tour-actions">${command('Zählerplätze bearbeiten')}</div></div>`],
      ['Platz für den Tausch auswählen', '10P1 sitzt links, 10P4 in der Mitte. In der Zeichnung ziehst du die erste Platte auf die zweite. Mit «Plätze tauschen» kannst du die Änderung hier nachvollziehen.',
        editor('Dispo · Zählerplätze', 'Vor dem Tausch', field('Links', '10P1 · Allgemein') + field('Mitte', '10P4 · E-Mobility') + command('Plätze tauschen'), drawing(row, 'Vor dem Tausch sitzt 10P1 auf der linken Zählerplatte'))],
      ['Zählerplätze im Aufbau tauschen', 'Ziehe «Allgemein» auf den Platz von «E-Mobility». Nach dem Loslassen sitzt 10P1 in der Mitte und 10P4 links. Die Bezeichnungen im Schema bleiben erhalten.', swap()],
    ],
  },
};
export const heroCad = {schema: schemaSource, dispo: assembled};
