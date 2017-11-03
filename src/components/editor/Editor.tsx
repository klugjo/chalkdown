import * as React from 'react';
import {connect} from 'react-redux';
import {Dispatch} from 'redux';

import * as css from './Editor.css'
import core from './core';

interface IEditorProps {}

interface IEditorState {}

class Editor extends React.Component<IEditorProps, IEditorState> {
    private _root: HTMLDivElement;
    private _content: HTMLPreElement;

    public componentDidMount() {

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

const mapStateToProps = (state: any) => {
    return state;
};

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
    return {};
};

export default connect<{}, {}, IEditorProps>(
    mapStateToProps,
    mapDispatchToProps
)(Editor);
