import {createEventHooks, isWebkit} from './utils';

const useBr = isWebkit;
const trailingNodeTag = 'div';
const hiddenLfInnerHtml = '<br><span class="hd-lf" style="display: none">\n</span>';
const lfHtml = '<span class="lf">' + (useBr ? hiddenLfInnerHtml : '\n') + '</span>';

const styleElts = [];

const createStyleSheet = (document : HTMLDocument) => {
    const styleElt = document.createElement('style');
    styleElt.type = 'text/css';
    styleElt.innerHTML = '.cledit-section * { display: inline; }';
    document.head.appendChild(styleElt);
    styleElts.push(styleElt);
}

class Section {
    public text: any;
    public data: any;
    public elt: any;

    constructor(text) {
        this.text = text.text === undefined ? text : text.text;
        this.data = text.data;
    }

    public setElement = (elt) => {
        this.elt = elt;
        elt.section = this;
    }
}

export default class Highlighter {
    private _editor: IEditor;
    private _sectionList: any[];
    private _insertBeforeSection: any;
    private _trailingNode: HTMLElement;

    public isComposing : number;

    constructor(editor : IEditor) {
        createEventHooks(this);

        if (!styleElts.some((styleElt : HTMLStyleElement) => editor._document.head.contains(styleElt))) {
            createStyleSheet(editor._document);
        }

        this._editor = editor;
        this._sectionList = [];

        this.isComposing = 0;
    }

    public fixContent = (modifiedSections, removedSections, noContentFix) => {
        modifiedSections.forEach((section) => {
            section.forceHighlighting = true;
            if (!noContentFix) {
                if (useBr) {
                    section.elt.getElementsByClassName('hd-lf').forEach((lfElt) => {
                        lfElt.parentNode.removeChild(lfElt);
                    });
                    section.elt.getElementsByTagName('br').forEach((brElt) => {
                        brElt.parentNode.replaceChild(this._editor._document.createTextNode('\n'), brElt);
                    });
                }

                if (section.elt.textContent.slice(-1) !== '\n') {
                    section.elt.appendChild(this._editor._document.createTextNode('\n'));
                }
            }
        });
    }

    public addTrailingNode = () => {
        this._trailingNode = this._editor._document.createElement(trailingNodeTag);
        this._editor._contentElt.appendChild(this._trailingNode);
    }

    public parseSections = (content, isInit) => {
        const contentElt = this._editor._contentElt;

        if (this.isComposing) {
            return this._sectionList;
        }

        let newSectionList = this._editor.options.sectionParser ? this._editor.options.sectionParser(content) : [content]
        newSectionList = newSectionList.map((sectionText) => {
            return new Section(sectionText);
        })

        let modifiedSections = [];
        let sectionsToRemove = [];
        this._insertBeforeSection = undefined;

        if (isInit) {
            // Render everything if isInit
            sectionsToRemove = this._sectionList;
            this._sectionList = newSectionList;
            modifiedSections = newSectionList;
        } else {
            // Find modified section starting from top
            var leftIndex = this._sectionList.length;
            this._sectionList.some((section, index) => {
                const newSection = newSectionList[index];
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check text modification
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text) {
                    leftIndex = index;
                    return true;
                }
            });

            // Find modified section starting from bottom
            let rightIndex = -this._sectionList.length
            this._sectionList.slice().reverse().some(function (section, index) {
                let newSection = newSectionList[newSectionList.length - index - 1]
                if (index >= newSectionList.length ||
                    section.forceHighlighting ||
                    // Check modified
                    section.text !== newSection.text ||
                    // Check that section has not been detached or moved
                    section.elt.parentNode !== contentElt ||
                    // Check also the content since nodes can be injected in sections via copy/paste
                    section.elt.textContent !== newSection.text) {
                    rightIndex = -index;
                    return true;
                }
            })

            if (leftIndex - rightIndex > this._sectionList.length) {
                // Prevent overlap
                rightIndex = leftIndex - this._sectionList.length;
            }

            let leftSections = this._sectionList.slice(0, leftIndex);
            modifiedSections = newSectionList.slice(leftIndex, newSectionList.length + rightIndex);
            let rightSections = this._sectionList.slice(this._sectionList.length + rightIndex, this._sectionList.length);
            this._insertBeforeSection = rightSections[0];
            sectionsToRemove = this._sectionList.slice(leftIndex, this._sectionList.length + rightIndex);
            this._sectionList = leftSections.concat(modifiedSections).concat(rightSections);
        }

        const newSectionEltList = this._editor._document.createDocumentFragment();
        modifiedSections.forEach((section) => {
            section.forceHighlighting = false;
            this.highlight(section);
            newSectionEltList.appendChild(section.elt);
        });

        this._editor.watcher.noWatch(() => {
            if (isInit) {
                contentElt.innerHTML = '';
                contentElt.appendChild(newSectionEltList);
                return this.addTrailingNode();
            }

            // Remove outdated sections
            sectionsToRemove.forEach((section) => {
                // section may be already removed
                section.elt.parentNode === contentElt && contentElt.removeChild(section.elt);
                // To detect sections that come back with built-in undo
                section.elt.section = undefined;
            })

            if (this._insertBeforeSection !== undefined) {
                contentElt.insertBefore(newSectionEltList, this._insertBeforeSection.elt);
            } else {
                contentElt.appendChild(newSectionEltList);
            }

            // Remove unauthorized nodes (text nodes outside of sections or duplicated sections via copy/paste)
            let childNode = contentElt.firstChild;
            while (childNode) {
                var nextNode = childNode.nextSibling;
                if (!(childNode as any).section) {
                    contentElt.removeChild(childNode);
                }
                childNode = nextNode;
            }
            this.addTrailingNode();
            (this as any).trigger('highlighted');
            this._editor.selectionMgr.restoreSelection();
            this._editor.selectionMgr.updateCursorCoordinates();
        }

        return this._sectionList;
    }

    public highlight = (section) => {
        var html = this._editor.options.sectionHighlighter(section).replace(/\n/g, lfHtml);
        var sectionElt = this._editor._document.createElement('div');
        sectionElt.className = 'cledit-section';
        sectionElt.innerHTML = html;
        section.setElement(sectionElt);
        (this as any).trigger('sectionHighlighted', section);
    }
}
