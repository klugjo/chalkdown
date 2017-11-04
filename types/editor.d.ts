declare interface IEditorParameters {
    rootElement: HTMLDivElement;
    contentElement: HTMLPreElement;
}

declare interface IEditorObservable {
    trigger?: (eventType: any, ...args: any[]) => void;
    on?: (eventType: any, listener: any) => void;
    off?: (eventType: any, listener: any) => void;
}

declare interface IEditor extends IEditorObservable {
    _contentElt?: HTMLDivElement;
    _scrollElt?: HTMLPreElement;
    _window?: any;
    _document?: HTMLDocument;
    _markers?: any;
    toggleEditable?: (isEditable: boolean) => void;
    watcher?: any;
    options?: any;
    selectionMgr?: any;
    _allElements?: any;
    getContent?: () => any;
    setContent?: (value: any, ...args: any[]) => any;
    keystrokes?: any[];
    highlighter?: any;
    adjustCursorPosition?: any;
    replace?: any;
    replaceAll?: any;
    focus?: any;
    setSelection?: any;
    addKeystroke?: any;
    addMarker?: any;
    removeMarker?: any;
    init?: any;
}
