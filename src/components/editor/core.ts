import DiffMatchPatch from './diffMatchPatch';

import {defaultKeystrokes} from './keys';
import {createEventHooks, debounce} from './utils';
import Highlighter from './Highlighter';
import SelectionManager from './SelectionManager';
import Watcher from './Watcher';

export default({rootElement, contentElement} : IEditorParameters) => {
    const editor : IEditor = {
        _contentElt: rootElement,
        _scrollElt: contentElement,
        _window: window,
        keystrokes: [],
        _markers: {}
    };

    editor._document = editor._window.document;

    createEventHooks(editor);

    editor.toggleEditable = function (isEditable : boolean) {
        if (isEditable === undefined) {
            isEditable = !editor._contentElt.contentEditable;
        }
        editor._contentElt.contentEditable = isEditable.toString();
    }

    editor.toggleEditable(true);

    const getTextContent = () => {
        let textContent = editor._contentElt
            .textContent
            .replace(/\r[\n\u0085]?|[\u2424\u2028\u0085]/g, '\n'); // Markdown-it sanitization (Mac/DOS to Unix)
        if (textContent.slice(-1) !== '\n') {
            textContent += '\n';
        }
        return textContent;
    }

    let lastTextContent = getTextContent();

    const highlighter = new Highlighter(editor);

    let sectionList;

    const parseSections = (content, isInit?) => {
        sectionList = highlighter.parseSections(content, isInit);
        editor._allElements = Array.prototype.slice
            .call(editor._contentElt.querySelectorAll('.cledit-section *'));
        return sectionList;
    }

    const checkContentChange = (mutations) => {
        watcher.noWatch(function () {
            const removedSections = [];
            const modifiedSections = [];

            const markModifiedSection = (node) => {
                while (node && node !== editor._contentElt) {
                    if (node.section) {
                        var array = node.parentNode
                            ? modifiedSections
                            : removedSections;
                        return array.indexOf(node.section) === -1 && array.push(node.section);
                    }
                    node = node.parentNode;
                }
            }

            mutations.forEach((mutation) => {
                markModifiedSection(mutation.target);
                mutation.addedNodes.forEach(markModifiedSection);
                mutation.removedNodes.forEach(markModifiedSection);
            });
            highlighter.fixContent(modifiedSections, removedSections, noContentFix);
            noContentFix = false;
        });

        var newTextContent = getTextContent();
        var diffs = diffMatchPatch.diff_main(lastTextContent, newTextContent);
        Object.keys(editor._markers).forEach((k: string) => {
            editor._markers[k].adjustOffset(diffs);
        });

        selectionMgr.saveSelectionState();
        var sectionList = parseSections(newTextContent);
        editor.trigger('contentChanged', newTextContent, diffs, sectionList);

        // if (!ignoreUndo) {
        //     undoMgr.addDiffs(lastTextContent, newTextContent, diffs)
        //     undoMgr.setDefaultMode('typing')
        //     undoMgr.saveState()
        // }
        ignoreUndo = false;
        lastTextContent = newTextContent;
        triggerSpellCheck();
    }

    // Used to detect editor changes
    const watcher = new Watcher(editor, checkContentChange);
    watcher.startWatching();

    const diffMatchPatch = new DiffMatchPatch();

    const selectionMgr = new SelectionManager(editor);

    const adjustCursorPosition = (force?) => {
        selectionMgr.saveSelectionState(true, true, force);
    }

    const replaceContent = (selectionStart, selectionEnd, replacement) => {
        var min = Math.min(selectionStart, selectionEnd);
        var max = Math.max(selectionStart, selectionEnd);
        var range = selectionMgr.createRange(min, max);
        var rangeText = '' + range;
        // Range can contain a br element, which is not taken into account in rangeText
        if (rangeText.length === max - min && rangeText === replacement) {
            return;
        }
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        return range;
    }

    let ignoreUndo = false;
    let noContentFix = false;

    const setContent = (value, noUndo, maxStartOffset) => {
        const textContent = getTextContent();
        maxStartOffset = maxStartOffset !== undefined && maxStartOffset < textContent.length
            ? maxStartOffset
            : textContent.length - 1;
        const startOffset = Math.min(diffMatchPatch.diff_commonPrefix(textContent, value), maxStartOffset);
        const endOffset = Math.min(diffMatchPatch.diff_commonSuffix(textContent, value), textContent.length - startOffset, value.length - startOffset);
        const replacement = value.substring(startOffset, value.length - endOffset);
        const range = replaceContent(startOffset, textContent.length - endOffset, replacement);

        if (range) {
            ignoreUndo = noUndo;
            noContentFix = true;
        }

        return {
            start: startOffset,
            end: value.length - endOffset,
            range: range
        }
    }

    const replace = (selectionStart, selectionEnd, replacement) => {
        // undoMgr.setDefaultMode('single');
        replaceContent(selectionStart, selectionEnd, replacement);

        const endOffset = selectionStart + replacement.length;

        selectionMgr.setSelectionStartEnd(endOffset, endOffset);
        selectionMgr.updateCursorCoordinates(true);
    }

    const replaceAll = (search, replacement) => {
        // undoMgr.setDefaultMode('single');
        const textContent = getTextContent();
        const value = textContent.replace(search, replacement);

        if (value !== textContent) {
            const offset = editor.setContent(value);
            selectionMgr.setSelectionStartEnd(offset.end, offset.end);
            selectionMgr.updateCursorCoordinates(true);
        }
    }

    const focus = () => {
        selectionMgr.restoreSelection();
    }

    // const undoMgr = new UndoMgr(editor);

    const addMarker = (marker) => {
        editor._markers[marker.id] = marker;
    }

    const removeMarker = (marker) => {
        delete editor._markers[marker.id];
    }

    const triggerSpellCheck = debounce(() => {
        const selection = window.getSelection();
        if (!selectionMgr.hasFocus ||
            highlighter.isComposing ||
            selectionMgr.selectionStart !== selectionMgr.selectionEnd ||
            !(selection as any).modify) {
            return;
        }
        // Hack for Chrome to trigger the spell checker
        if (selectionMgr.selectionStart) {
            (selection as any).modify('move', 'backward', 'character');
            (selection as any).modify('move', 'forward', 'character');
        } else {
            (selection as any).modify('move', 'forward', 'character');
            (selection as any).modify('move', 'backward', 'character');
        }
    }, 10);

    const setSelection = (start, end) => {
        end = end === undefined
            ? start
            : end
        selectionMgr.setSelectionStartEnd(start, end);
        selectionMgr.updateCursorCoordinates();
    }

    const keydownHandler = (handler) => {
        return (evt) => {
            if (evt.which !== 17 && // Ctrl
                evt.which !== 91 && // Cmd
                evt.which !== 18 && // Alt
                evt.which !== 16 // Shift
            ) {
                handler(evt);
            }
        };
    }

    const tryDestroy = () => {
        if (!window.document.contains(editor._contentElt)) {
            watcher.stopWatching();
            window.removeEventListener('keydown', windowKeydownListener);
            window.removeEventListener('mouseup', windowMouseupListener);
            editor.trigger('destroy');
            return true;
        }
    }

    // In case of Ctrl/Cmd+A outside the editor element
    const windowKeydownListener = (evt) => {
        if (!tryDestroy()) {
            keydownHandler(adjustCursorPosition)(evt);
        }
    }

    window.addEventListener('keydown', windowKeydownListener, false);

    // Mouseup can happen outside the editor element
    const windowMouseupListener = () => {
        if (!tryDestroy()) {
            selectionMgr.saveSelectionState(true, false);
        }
    }
    window.addEventListener('mouseup', windowMouseupListener);
    // This can also provoke selection changes and does not fire mouseup event on
    // Chrome/OSX
    editor._contentElt.addEventListener('contextmenu', selectionMgr.saveSelectionState.bind(selectionMgr, true, false));

    editor._contentElt.addEventListener('keydown', keydownHandler((evt) => {
        selectionMgr.saveSelectionState();
        adjustCursorPosition();

        // Perform keystroke
        const textContent = getTextContent();
        let min = Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
        let max = Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);
        const state = {
            before: textContent.slice(0, min),
            after: textContent.slice(max),
            selection: textContent.slice(min, max),
            isBackwardSelection: selectionMgr.selectionStart > selectionMgr.selectionEnd
        };
        editor.keystrokes.some((keystroke) => {
                if (keystroke.handler(evt, state, editor)) {
                    editor.setContent(state.before + state.selection + state.after, false, min);
                    min = state.before.length;
                    max = min + state.selection.length;
                    selectionMgr.setSelectionStartEnd(state.isBackwardSelection ? max : min,
                        state.isBackwardSelection ? min : max);
                    return true;
                }
            })
    }), false);

    editor._contentElt.addEventListener('compositionstart', () => {
        highlighter.isComposing++;
    }, false);

    editor._contentElt.addEventListener('compositionend', () => {
        setTimeout(() => {
            highlighter.isComposing && highlighter.isComposing--;
        }, 0);
    }, false);

    editor._contentElt.addEventListener('paste', (evt) => {
        // undoMgr.setCurrentMode('single')
        evt.preventDefault();
        let data;
        let clipboardData = evt.clipboardData;
        if (clipboardData) {
            data = clipboardData.getData('text/plain');
        } else {
            clipboardData = (window as any).clipboardData;
            data = clipboardData && clipboardData.getData('Text');
        }
        if (!data) {
            return;
        }
        replace(selectionMgr.selectionStart, selectionMgr.selectionEnd, data);
        adjustCursorPosition();
    }, false);

    editor._contentElt.addEventListener('cut', () => {
        // undoMgr.setCurrentMode('single');
        adjustCursorPosition();
    }, false);

    editor._contentElt.addEventListener('focus', () => {
        selectionMgr.hasFocus = true;
        editor.trigger('focus');
    }, false);

    editor._contentElt.addEventListener('blur', () => {
        selectionMgr.hasFocus = false;
        editor.trigger('blur');
    }, false);

    const addKeystroke = (keystrokes) => {
        if (!Array.isArray(keystrokes)) {
            keystrokes = [keystrokes];
        }
        editor.keystrokes = editor.keystrokes.concat(keystrokes)
            .sort(function (keystroke1, keystroke2) {
                return keystroke1.priority - keystroke2.priority;
            });
    }
    addKeystroke(defaultKeystrokes);

    editor.selectionMgr = selectionMgr;
    // editor.undoMgr = undoMgr
    editor.highlighter = highlighter;
    editor.watcher = watcher;
    editor.adjustCursorPosition = adjustCursorPosition;
    editor.setContent = setContent;
    editor.replace = replace;
    editor.replaceAll = replaceAll;
    editor.getContent = getTextContent;
    editor.focus = focus;
    editor.setSelection = setSelection;
    editor.addKeystroke = addKeystroke;
    editor.addMarker = addMarker;
    editor.removeMarker = removeMarker;

    editor.init = (options: any = {}) => {
        options = {
            cursorFocusRatio: 0.5,
            sectionHighlighter: function (section) {
                return section
                    .text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/\u00a0/g, ' ');
            },
            sectionDelimiter: '',
            ...options
        };
        editor.options = options;

        if (options.content !== undefined) {
            lastTextContent = options
                .content
                .toString();
            if (lastTextContent.slice(-1) !== '\n') {
                lastTextContent += '\n';
            }
        }

        var sectionList = parseSections(lastTextContent, true);
        editor.trigger('contentChanged', lastTextContent, [
            0, lastTextContent
        ], sectionList);
        if (options.selectionStart !== undefined && options.selectionEnd !== undefined) {
            editor.setSelection(options.selectionStart, options.selectionEnd);
        } else {
            selectionMgr.saveSelectionState();
        }
        // undoMgr.init(options)

        if (options.scrollTop !== undefined) {
            editor._scrollElt.scrollTop = options.scrollTop;
        }
    }

    return editor;
}
