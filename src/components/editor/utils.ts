export const isGecko = 'MozAppearance' in document.documentElement.style;

export const isWebkit = 'WebkitAppearance' in document.documentElement.style;

export const isMsie = 'msTransform' in document.documentElement.style;

export const isMac = navigator.userAgent.indexOf('Mac OS X') !== -1;

export const createEventHooks = (object : any) => {
    const listenerMap = Object.create(null);

    object.trigger = (eventType, ...args) => {
        const listeners = listenerMap[eventType];
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener.apply(object, args);
                } catch (e) {
                    console.error(e.message, e.stack);
                }
            })
        }
    }

    object.on = (eventType, listener) => {
        let listeners = listenerMap[eventType];
        if (!listeners) {
            listeners = [];
            listenerMap[eventType] = listeners;
        }
        listeners.push(listener);
    }

    object.off = (eventType, listener) => {
        const listeners = listenerMap[eventType];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (~ index) {
                listeners.splice(index, 1);
            }
        }
    }
}

export const defer = (function () {
    const queue = new Array(1000);
    let queueLength = 0;
    function flush() {
        for (var i = 0; i < queueLength; i++) {
            try {
                queue[i]();
            } catch (e) {
                console.error(e.message, e.stack);
            }
            queue[i] = undefined;
        }
        queueLength = 0;
    }

    let iterations = 0;
    const observer = new (window as any).MutationObserver(flush);
    const node = document.createTextNode('');
    observer.observe(node, {characterData: true});

    return (fn) => {
        queue[queueLength++] = fn;
        if (queueLength === 1) {
            node.data = (iterations = ++iterations % 2).toString();
        }
    };
})();

export const debounce = (func, wait) => {
    let timeoutId;
    let isExpected;
    return wait ?
        () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(func, wait);
        } :
        () => {
            if (!isExpected) {
                isExpected = true;
                defer(() => {
                    isExpected = false;
                    func();
                });
            }
        }
};
