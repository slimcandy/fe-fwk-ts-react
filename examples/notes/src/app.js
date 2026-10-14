import { createComponent, createElement } from "fe-fwk-ts-react";

import { rendered } from "./tracker.js";

const DAYS = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday" };

// One note, read-only. `mountedAs` is state, set once when the component is
// mounted, like `useState(note.text)` in React. Props can change later; this
// state doesn't. That's what shows which component sits in which position.
const Note = createComponent({
  state(props) {
    return { mountedAs: props.note.text };
  },

  render() {
    const { note } = this.props;
    const day = DAYS[note.updated.slice(0, 3)];

    return rendered(
      this,
      "Note",
      createElement(
        "li",
        { class: "grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]" },
        [
          createElement("p", { class: "text-sm/6 font-medium text-gray-900 dark:text-white" }, [note.text]),
          createElement("p", { class: "text-xs/6 text-gray-500 sm:text-right dark:text-gray-400" }, [
            `Edited on ${day}`,
          ]),
          createElement("p", { class: "font-mono text-xs/5 text-gray-500 sm:col-span-2 dark:text-gray-400" }, [
            `mounted as: ${this.state.mountedAs}`,
          ]),
        ]
      )
    );
  },
});

// No props, no state: it renders once and stays silent.
const Static = createComponent({
  render() {
    return rendered(
      this,
      "Static",
      createElement("p", { class: "px-4 py-3 text-xs/5 text-gray-500 dark:text-gray-400" }, [
        "A static component: no props, no state, so it renders only once.",
      ])
    );
  },
});

let app;

// The root. Props: the first notes, and whether the list uses keys. The page
// remounts the app when the key checkbox changes.
export const App = createComponent({
  state(props) {
    return { notes: props.notes };
  },

  render() {
    app = this;
    const { keyed } = this.props;

    return rendered(
      this,
      "App",
      createElement(
        "div",
        {
          class:
            "overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10",
        },
        [
          createElement("h3", { class: "border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-white/10" }, [
            "My notes",
          ]),
          createElement(
            "ul",
            { role: "list", class: "divide-y divide-gray-200 dark:divide-white/10" },
            this.state.notes.map((note) => createElement(Note, keyed ? { key: note.id, note } : { note }))
          ),
          createElement("div", { class: "border-t border-gray-200 dark:border-white/10" }, [createElement(Static)]),
        ]
      )
    );
  },
});

export function currentApp() {
  return app;
}

export function setNotes(notes) {
  app.setState({ notes });
}
