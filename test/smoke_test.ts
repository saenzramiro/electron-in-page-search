import injectScriptToWebView from '../src/index';
import * as A from 'assert';
import {remote} from 'electron';
import {spy} from 'sinon';

function waitForReady(w: Electron.WebViewElement) {
    return new Promise(resolve => {
        const c = w.getWebContents && w.getWebContents();
        if (c) {
            resolve(w);
            return;
        }
        w.addEventListener('dom-ready', resolve);
    });
}

function pause1000ms() {
    return new Promise(resolve => {
        setTimeout(resolve, 1000);
    });
}

context('For browser window', function () {
    before(function () {
        const div = document.createElement('div');
        div.innerText = 'foo bar baz foo bar piyo poyo';
        document.body.appendChild(div);
    });

    describe('injectScriptToWebView()', function () {
        it('creates search instance which enables in-page search', function () {
            const s = injectScriptToWebView(remote.getCurrentWebContents());
            A.ok(s);
            A.ok(!s.opened);
            A.ok(!s.targetIsWebview);

            const w = document.querySelector('webview') as Electron.WebViewElement;
            A.equal(w.className, 'electron-in-page-search-window search-inactive search-firstpaint');

            const opened = spy();
            s.on('open', opened);

            s.openSearchWindow();
            A.ok(opened.called);
            A.ok(s.opened);

            const started = spy();
            s.on('start', started);

            A.equal(w.className, 'electron-in-page-search-window search-active');

            const next = spy();
            return waitForReady(w).then(pause1000ms).then(() => {
                remote.getCurrentWindow().focusOnWebView();
                w.executeJavaScript(`(function() {
                    document.querySelector('.inpage-search-input').value = 'foo';
                    document.querySelector('.inpage-search-forward').click();
                })()`);
            }).then(pause1000ms).then(() => {
                A.ok(started.called);
                A.equal(started.args[0][0], 'foo');

                s.on('next', next);

                w.executeJavaScript(`(function() {
                    document.querySelector('.inpage-search-forward').click();
                })()`);
            }).then(pause1000ms).then(() => {
                A.ok(next.called);
                A.equal(next.args[0][0], 'foo');
                A.ok(next.args[0][1]);
                w.executeJavaScript(`(function() {
                    document.querySelector('.inpage-search-close').click();
                })()`);
            }).then(pause1000ms).then(() => {
                A.ok(!s.opened);
                A.equal(w.className, 'electron-in-page-search-window search-inactive');
            });
        });
    });
});
