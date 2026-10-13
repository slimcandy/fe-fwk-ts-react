import { createComponent, createElement } from "fe-fwk-ts-react";

import { action, rendered } from "./tracker.js";

// Tailwind Plus: Application UI → Elements → Buttons
const PRIMARY =
  "rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:shadow-none dark:hover:bg-gray-200 dark:focus-visible:outline-white";
const SECONDARY =
  "rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20";
const DANGER =
  "rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-red-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-red-50 dark:bg-white/10 dark:text-red-400 dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-red-400/10";
// Tailwind Plus: Application UI → Forms → Textareas
const TEXTAREA =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-900 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-white";

const INITIAL_NOTES = [
  "Read chapter 8: the reconciliation algorithm",
  "Buy oat milk and coffee beans",
  "Call the bike shop about the brakes",
  "Write tests before fixing the bug",
  "Book tickets for the trip to Bergen",
];

let nextId = INITIAL_NOTES.length;

// The new-note form. The textarea is uncontrolled: the framework never writes
// its value, so typing re-renders this component but costs no DOM writes,
// except when the button switches between enabled and disabled.
const NoteForm = createComponent({
  state() {
    return { text: "" };
  },

  changeText(event) {
    action("Typed in the new note");
    this.setState({ text: event.target.value });
  },

  submit(event) {
    event.preventDefault();
    const text = this.state.text.trim();
    if (!text) {
      return;
    }
    this.emit("add", text);
    event.target.reset();
    this.setState({ text: "" });
  },

  render() {
    rendered(this, "NoteForm");
    const isEmpty = this.state.text.trim() === "";

    return createElement(
      "form",
      { class: "flex flex-col gap-3", on: { submit: (event) => this.submit(event) } },
      [
        createElement("label", { for: "new-note", class: "sr-only" }, ["New note"]),
        createElement("textarea", {
          id: "new-note",
          rows: "2",
          placeholder: "Write a note…",
          class: TEXTAREA,
          on: { input: (event) => this.changeText(event) },
        }),
        createElement("div", { class: "flex justify-end" }, [
          createElement("button", { type: "submit", class: PRIMARY, disabled: isEmpty }, [
            "Add note",
          ]),
        ]),
      ]
    );
  },
});

// One note. It re-renders only when its own props or state change: when another
// note is edited, `updateProps()` sees equal props and skips render().
const Note = createComponent({
  state(props) {
    return { isEditing: false, draft: props.note.text };
  },

  startEditing() {
    action("Opened a note for editing");
    this.setState({ isEditing: true, draft: this.props.note.text });
  },

  changeDraft(event) {
    action("Typed in a note");
    this.setState({ draft: event.target.value });
  },

  save(event) {
    event.preventDefault();
    const text = this.state.draft.trim();
    if (!text) {
      return;
    }
    action("Saved a note");
    this.setState({ isEditing: false });
    this.emit("save", { id: this.props.note.id, text });
  },

  cancel() {
    action("Cancelled editing");
    this.setState({ isEditing: false });
  },

  render() {
    rendered(this, "Note");
    const { note } = this.props;

    if (this.state.isEditing) {
      return createElement("li", { class: "p-4" }, [
        createElement(
          "form",
          { class: "flex flex-col gap-3", on: { submit: (event) => this.save(event) } },
          [
            createElement("label", { for: `note-${note.id}`, class: "sr-only" }, ["Note text"]),
            createElement(
              "textarea",
              {
                id: `note-${note.id}`,
                rows: "2",
                class: TEXTAREA,
                on: { input: (event) => this.changeDraft(event) },
              },
              [note.text]
            ),
            createElement("div", { class: "flex justify-end gap-2" }, [
              createElement("button", { type: "button", class: SECONDARY, on: { click: () => this.cancel() } }, [
                "Cancel",
              ]),
              createElement("button", { type: "submit", class: PRIMARY }, ["Save"]),
            ]),
          ]
        ),
      ]);
    }

    return createElement("li", { class: "flex flex-col gap-3 p-4 sm:flex-row sm:items-center" }, [
      createElement("p", { class: "min-w-0 flex-1 text-sm/6 break-words text-gray-900 dark:text-white" }, [
        note.text,
      ]),
      createElement("div", { class: "flex shrink-0 gap-2" }, [
        createElement("button", { type: "button", class: SECONDARY, on: { click: () => this.startEditing() } }, [
          "Edit",
        ]),
        createElement(
          "button",
          { type: "button", class: SECONDARY, on: { click: () => this.emit("pin", note.id) } },
          ["Pin to top"]
        ),
        createElement(
          "button",
          { type: "button", class: DANGER, on: { click: () => this.emit("remove", note.id) } },
          ["Delete"]
        ),
      ]),
    ]);
  },
});

export const App = createComponent({
  state() {
    return {
      notes: INITIAL_NOTES.map((text, id) => ({ id, text })),
    };
  },

  addNote(text) {
    action("Added a note");
    this.setState({ notes: [{ id: nextId++, text }, ...this.state.notes] });
  },

  saveNote({ id, text }) {
    this.setState({
      notes: this.state.notes.map((note) => (note.id === id ? { ...note, text } : note)),
    });
  },

  removeNote(id) {
    action("Deleted a note");
    this.setState({ notes: this.state.notes.filter((note) => note.id !== id) });
  },

  pinNote(id) {
    action("Pinned a note to the top");
    const note = this.state.notes.find((note) => note.id === id);
    this.setState({ notes: [note, ...this.state.notes.filter((other) => other !== note)] });
  },

  render() {
    rendered(this, "App");
    const { notes } = this.state;

    return createElement("div", { class: "flex flex-col gap-6" }, [
      createElement(NoteForm, { on: { add: this.addNote } }),
      notes.length === 0
        ? createElement(
            "p",
            {
              class:
                "rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400",
            },
            ["No notes. Add one above."]
          )
        : createElement(
            "ul",
            {
              role: "list",
              class:
                "divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10",
            },
            notes.map((note) =>
              createElement(Note, {
                key: note.id,
                note,
                on: { save: this.saveNote, remove: this.removeNote, pin: this.pinNote },
              })
            )
          ),
    ]);
  },
});
