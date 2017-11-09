import * as React from 'react';

import './Editor.css';
import core from './core';
import mdGrammar from './mdGrammar';

const prismjs  = require('prismjs/components/prism-core');

interface IEditorProps {}

interface IEditorState {}

export default class Editor extends React.Component<IEditorProps, IEditorState> {
    private _root: HTMLDivElement;
    private _content: HTMLPreElement;

    public componentDidMount() {
        const editor = core({rootElement: this._root, contentElement: this._content});

        const prismGrammar = mdGrammar({
            fences: true,
            tables: true,
            footnotes: true,
            abbrs: true,
            deflists: true,
            tocs: true,
            dels: true,
            subs: true,
            sups: true
        });

        editor.init({
            sectionHighlighter: (section) => {
                return section.text ? prismjs.highlight(section.text, prismGrammar) : '';
            },
            // Optional (increases performance on large documents)
            sectionParser: (text) => {
                var offset = 0;
                var sectionList = [];
                (text + '\n\n').replace(/^.+[ \t]*\n=+[ \t]*\n+|^.+[ \t]*\n-+[ \t]*\n+|^\#{1,6}[ \t]*.+?[ \t]*\#*\n+/gm,
                    (match, matchOffset) => {
                        sectionList.push(text.substring(offset, matchOffset));
                        offset = matchOffset;
                        return match;
                });
                sectionList.push(text.substring(offset));
                return sectionList;
            }
        })
    }

    public render() {
        return (
            <div ref={this.onRootRef}>
                <pre ref={this.onContentRef}>
                    # Basic writing

                    ## Styling text

                    Make text **bold** or *italic* by using either `*` or `_` around the text.

                    _This text will be italic_
                    __This text will be bold__

                    Create strikethrough text by using `~~`.

                    ~~Mistaken text.~~
                </pre>
            </div>
        );
    }

    private onRootRef = (elt: HTMLDivElement) => {
        this._root = elt;
    }

    private onContentRef = (elt: HTMLPreElement) => {
        this._content = elt;
    }
}
