// The timeline behind the slider. Each step is the list of notes after it,
// plus what to notice, with and without keys.

const milk = { id: "milk", text: "Buy oat milk", updated: "Mon 09:12" };
const mum = { id: "mum", text: "Call mum", updated: "Mon 09:20" };
const bike = { id: "bike", text: "Fix the bike", updated: "Mon 09:31" };
const tickets = { id: "tickets", text: "Book tickets to Bergen", updated: "Mon 10:05" };
const book = { id: "book", text: "Read chapter 8", updated: "Mon 10:40" };

const momEdited = { ...mum, text: "Call mum about Sunday", updated: "Mon 09:44" };
const bikeSaved = { ...bike, updated: "Mon 09:47" };

export const STEPS = [
  {
    title: "First render",
    notes: [milk, mum, bike],
    note: "Every component runs render() once. The framework builds the whole tree in memory, then puts it on the page with a single DOM write. Then the demo types “my draft” into the first note’s input: that text lives only in the DOM, in no props and no state.",
  },
  {
    title: "Edit the second note",
    notes: [milk, momEdited, bike],
    note: "Only the edited note gets new props, so only it renders. On the page, one text changes. Keys make no difference: the number of notes stays the same. “Mounted as” keeps the old text: state is set once, at mount, like useState(initialValue).",
  },
  {
    title: "Autosave touches the third note",
    notes: [milk, momEdited, bikeSaved],
    note: "Its time changed from 09:31 to 09:47, so it renders again. But it shows only the day, and it's still Monday. render() ran, a console.log in it would print, and the DOM didn't change: the diff found nothing to write.",
  },
  {
    title: "Add a note to the end",
    notes: [milk, momEdited, bikeSaved, tickets],
    note: "The new note takes a new, last position. With keys or without, the result is the same: one new <li>.",
  },
  {
    title: "Remove the last note",
    notes: [milk, momEdited, bikeSaved],
    note: "The last position goes away. Keys don't matter here either.",
  },
  {
    title: "Add a note to the top",
    notes: [book, milk, momEdited, bikeSaved],
    keyed:
      "With keys, the framework sees the same notes, one place lower, and a new one on top: one new <li>. The other notes keep their props and don't even render. “my draft” moves down with its note: its <input> is the same DOM node.",
    unkeyed:
      "Without keys, notes are matched by position. Position 1 keeps its component and gets the new note's props, position 2 gets the old first note's props, and so on; a new <li> is added at the end. The page reads correctly, but look at “mounted as”: state stayed with the position, and so did “my draft”: the first <input> is the same DOM node, now next to another note. The framework did exactly what the tree said: update three, add one at the end. Reading it as “insert at the top” is our interpretation.",
  },
  {
    title: "Remove the first note",
    notes: [milk, momEdited, bikeSaved],
    keyed: "With keys, one <li> is removed: the one that belonged to the removed note.",
    unkeyed:
      "Without keys, every position takes the props of the note after it, and the last <li> is removed, although it was the first note that went away. “Mounted as” matches the text again only because every position is back to the note it was mounted with.",
  },
];

export function explain(step, keyed) {
  return step.note ?? (keyed ? step.keyed : step.unkeyed);
}
