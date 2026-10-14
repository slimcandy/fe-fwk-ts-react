import { createComponent, createElement } from "fe-fwk-ts-react";

import { rendered } from "./tracker.js";
import { idOf } from "./views.js";

// One note, read-only. `mountedAs` is state, set once when the component is
// mounted, like `useState(note.text)` in React. Props can change later; this
// state doesn't. The table next to the list shows it.
const Note = createComponent({
  state(props) {
    return { mountedAs: props.note.text };
  },

  render() {
    idOf(this);
    const { note } = this.props;

    return rendered(
      this,
      "Note",
      createElement("li", { class: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3" }, [
        createElement("p", { class: "text-sm/6 font-medium text-gray-900 dark:text-white" }, [note.text]),
        // A native field: what's typed in it lives only in the DOM, in no
        // props and no state. `inert`: the demo types, not the visitor.
        createElement("input", {
          type: "text",
          placeholder: "empty input",
          inert: "",
          class:
            "w-36 rounded-md bg-white px-2 py-0.5 font-mono text-xs/5 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 dark:bg-white/5 dark:text-white dark:outline-white/10",
        }),
      ])
    );
  },
});

// No props, no state: it renders when mounted and never again, so its
// console.log prints once per mount.
const Static = createComponent({
  render() {
    console.log("Static: render()");
    return rendered(
      this,
      "Static",
      createElement("p", { class: "px-4 py-3 text-xs/5 text-gray-500 dark:text-gray-400" }, [
        "A static component: its render() has a console.log, which prints when it mounts. No props, no state, so it never renders again.",
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
