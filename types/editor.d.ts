declare interface IEditorParameters {
    rootElement: HTMLDivElement;
    contentElement: HTMLPreElement;
}

declare interface IEditorObservable {
    trigger?: (eventType: any) => void;
    on?: (eventType: any, listener: any) => void;
    off?: (eventType: any, listener: any) => void;
}

declare interface IEditor extends IEditorObservable {
    _contentElt?: HTMLDivElement;
    _scrollElt?: HTMLPreElement;
    _window?: any;
    _document?: HTMLDocument;
    _keystrokes?: any[];
    _markers?: any;
    toggleEditable?: (isEditable: boolean) => void;
    watcher?: any;
    options?: any;
    selectionMgr?: any;
    _allElements?: any;
}
