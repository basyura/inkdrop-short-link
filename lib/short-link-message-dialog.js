"use babel";

import * as React from "react";
import { CompositeDisposable } from "event-kit";

export default class ShortLinkMessageDialog extends React.Component {
  componentWillMount() {
    // Events subscribed to in Inkdrop's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this dialog
    this.subscriptions.add(
      inkdrop.commands.add(document.body, {
        "short-link:toggle": () => this.toggle(),
      })
    );

    this.noteId = "";

    const editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.attatchEvents(editor);
    } else {
      inkdrop.onEditorLoad((e) => this.attatchEvents(e));
    }
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
    if (this.observe != null) {
      this.observe.disconnect();
    }

    const editor = inkdrop.getActiveEditor();
    if (editor != null) {
      const { cm } = editor;
      cm.off("keydown", this.handleKeydown);
    }
  }

  render() {
    const { MessageDialog } = inkdrop.components.classes;
    return (
      <MessageDialog ref="dialog" title="ShortLink">
        ShortLink was toggled!
      </MessageDialog>
    );
  }

  toggle() {
    const cm = inkdrop.getActiveEditor().cm;
    // used to match the url in the [example](here://something)
    // const urlRe = /\]\([\w:\-/?#\d\s.="']+\)/gim;
    const urlRe = /\]\(.*?\)/gim;

    cm.doc
      .getValue() // get whole page content
      .split("\n") // make it an array
      .forEach((line, lineNum) => {
        let match;
        while ((match = urlRe.exec(line))) {
          const el = document.createElement("span");
          el.className = 'short-link-mark'
          el.innerText = inkdrop.config.get("short-link.linkEmoji");

          cm.markText(
            {
              line: lineNum,
              ch: match.index + 2, // from
            },
            {
              line: lineNum,
              ch: urlRe.lastIndex - 1, // to
            },
            {
              atomic: 1,
              replacedWith: el,
              clearOnEnter: false,
              handleMouseEvents: true,
            }
          );
        }
      });
  }

  attatchEvents = (editor) => {
    const { cm } = editor;
    cm.on("keydown", this.handleKeydown);

    const editorEle = document.querySelector(".editor");
    this.observer = new MutationObserver((_) => this.handleEditorUpdate());
    this.observer.observe(editorEle, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  };

  handleKeydown = (cm, ev) => {
    if (ev.key != "Enter") {
      return;
    }
    let cur = cm.doc.getCursor();
    let marks = cm.doc.findMarks(cur, { line: cur.line, ch: cur.ch + 1 });
    marks.forEach((v) => v.clear());
  };

  handleEditorUpdate = () => {
    const id = inkdrop.store.getState().editingNote._id;
    if (this.noteId != id) {
      this.noteId = id;
      inkdrop.commands.dispatch(document.body, "short-link:toggle");
    }
  };
}
