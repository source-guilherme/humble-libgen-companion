// ==UserScript==
// @name         Humble LibGen Companion
// @namespace    https://github.com/source-guilherme
// @version      4.2
// @description  Adds a floating panel to Humble Bundle book pages with quick LibGen search links by book title or author, supporting fiction/non-fiction modes, query sanitizing, and persistent dark mode.
// @author       Source-Guilherme
// @match        https://www.humblebundle.com/books/*
// @grant        none
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/source-guilherme/humble-libgen-companion/main/humble-libgen-companion.user.js
// @downloadURL  https://raw.githubusercontent.com/source-guilherme/humble-libgen-companion/main/humble-libgen-companion.user.js
// ==/UserScript==

(function () {
    'use strict';

    const libgenIconURL = 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Emoji_u1f517.svg';
    let searchMode = 'nonfiction';
    let searchField = 'book';
    let theme = localStorage.getItem('libgenPanelTheme') || 'light';
    let searchSource = localStorage.getItem('libgenSearchSource') || 'libgen'; // or 'anna'

    const seenTitles = new Set();

    const panel = document.createElement('div');
    panel.id = 'libgen-panel';
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 340px;
        max-height: 70vh;
        overflow-y: auto;
        background: #fff;
        color: #000;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        padding: 10px;
        font-size: 14px;
        font-family: Arial, sans-serif;
        display: none;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '📚 Show LibGen Panel';
    toggleBtn.style = `
        position: fixed;
        top: 10px;
        right: 360px;
        z-index: 10000;
        background: #0073e6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
    `;
    toggleBtn.onclick = () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    const themeBtn = document.createElement('button');
    const modeBtn = document.createElement('button');
    const controls = document.createElement('div');
    const linksContainer = document.createElement('div');
    const fieldBtn = document.createElement('button');
    fieldBtn.textContent = '👤 Search: Book';
    fieldBtn.style = 'margin-left: 5px; padding: 4px 8px; cursor: pointer;';
    fieldBtn.onclick = () => {
        searchField = searchField === 'book' ? 'author' : 'book';
        fieldBtn.textContent = `👤 Search: ${searchField === 'book' ? 'Book' : 'Author'}`;
        seenTitles.clear();
        linksContainer.innerHTML = '';
        addLibgenLinks();
        applyTheme();
    };

    const sourceBtn = document.createElement('button');
    sourceBtn.textContent = `🌐 Source: ${searchSource === 'anna' ? 'Anna' : 'LibGen'}`;
    sourceBtn.style = 'margin-left: 5px; padding: 4px 8px; cursor: pointer;';
    sourceBtn.onclick = () => {
        searchSource = searchSource === 'libgen' ? 'anna' : 'libgen';
        localStorage.setItem('libgenSearchSource', searchSource);
        sourceBtn.textContent = `🌐 Source: ${searchSource === 'anna' ? 'Anna' : 'LibGen'}`;
        seenTitles.clear();
        linksContainer.innerHTML = '';
        addLibgenLinks();
        applyTheme();
    };
    controls.appendChild(sourceBtn);

    function applyTheme() {
        if (theme === 'dark') {
            panel.style.background = '#222';
            panel.style.color = '#eee';
            themeBtn.style.background = '#555';
            themeBtn.style.color = '#eee';
            modeBtn.style.background = '#555';
            modeBtn.style.color = '#eee';
            fieldBtn.style.background = '#555';
            fieldBtn.style.color = '#eee';
            sourceBtn.style.background = '#555';
            sourceBtn.style.color = '#eee';
            [...panel.querySelectorAll('a')].forEach(link => {
                link.style.color = '#9cf';
            });
        } else {
            panel.style.background = '#fff';
            panel.style.color = '#000';
            themeBtn.style.background = '#ddd';
            themeBtn.style.color = '#000';
            modeBtn.style.background = '#ddd';
            modeBtn.style.color = '#000';
            fieldBtn.style.background = '#ddd';
            fieldBtn.style.color = '#000';
            sourceBtn.style.background = '#ddd';
            sourceBtn.style.color = '#000';
            [...panel.querySelectorAll('a')].forEach(link => {
                link.style.color = '#1a0dab';
            });
        }
    }

    themeBtn.textContent = '🌓 Theme: Light';
    themeBtn.style = 'margin-right: 5px; padding: 4px 8px; cursor: pointer;';
    themeBtn.onclick = () => {
        theme = theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('libgenPanelTheme', theme);
        themeBtn.textContent = `🌓 Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
        applyTheme();
    };


    modeBtn.textContent = '🔍 Mode: Non-Fiction';
    modeBtn.style = 'margin-left: 5px; padding: 4px 8px; cursor: pointer;';
    modeBtn.onclick = () => {
        searchMode = searchMode === 'fiction' ? 'nonfiction' : 'fiction';
        modeBtn.textContent = `🔍 Mode: ${searchMode === 'fiction' ? 'Fiction' : 'Non-Fiction'}`;
        seenTitles.clear();
        linksContainer.innerHTML = '';
        addLibgenLinks();
        applyTheme();
    };

    controls.style = 'margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;';
    controls.appendChild(themeBtn);
    controls.appendChild(modeBtn);
    controls.appendChild(fieldBtn);

    panel.appendChild(controls);
    panel.appendChild(linksContainer);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);

    const getAuthorForTitle = (titleEl) => {
        const container = titleEl.closest('div.dd-image-box-text');
        if (!container) return null;
        const authorDiv = container.querySelector('.publishers-and-developers span');
        return authorDiv ? authorDiv.textContent.trim() : null;
    };

    function addLibgenLinks() {
        linksContainer.innerHTML = '';
        seenTitles.clear();
        
        const bookBlocks = document.querySelectorAll('div.tier-item-details-view');
        bookBlocks.forEach(block => {
            const titleEl = block.querySelector('h2.heading-medium');
            if (!titleEl) return;

            const bookTitle = titleEl.textContent.trim();
            if (!bookTitle || seenTitles.has(bookTitle)) return;
            seenTitles.add(bookTitle);
          
            let author = null;
            const pubInfoBlocks = block.querySelectorAll('.publishers-and-developers');
            pubInfoBlocks.forEach(info => {
                if (info.textContent.includes('Author:')) {
                    const span = info.querySelector('span');
                    if (span) author = span.textContent.trim();
                }
            });
          
            let rawQuery = searchField === 'author' ? author : bookTitle;
            if (!rawQuery) return;

            let query = rawQuery
            .replace(/[\/\\,:;'"“”‘’\[\](){}<>|*!?&#@%^~=`$]/g, '')
            .replace(/\s+/g, '+');

            let url = '';
            if (searchSource === 'anna') {
                url = `https://annas-archive.org/search?q=${query}`;
            } else if (searchField === 'author') {
                url = `https://libgen.is/search.php?req=${query}&open=0&res=25&view=detailed&phrase=1&column=author`;
            } else if (searchMode === 'nonfiction') {
                url = `https://libgen.is/search.php?req=${query}&open=0&res=25&view=detailed&phrase=1&column=title`;
            } else {
                url = `https://libgen.is/fiction/?q=${query}`; // Fiction still uses /fiction/
            }
          
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.style.display = 'block';
            link.style.marginBottom = '8px';
            link.style.textDecoration = 'none';

            const icon = document.createElement('img');
            icon.src = libgenIconURL;
            icon.alt = '🔗';
            icon.width = 14;
            icon.height = 14;
            icon.style.marginRight = '6px';
            icon.style.verticalAlign = 'middle';

            link.appendChild(icon);
            link.appendChild(document.createTextNode(bookTitle));
            linksContainer.appendChild(link);
        });

        if (searchSource === 'libgen') {
            const detailedButtonContainer = document.createElement('div');
            detailedButtonContainer.style.marginTop = '10px';
            detailedButtonContainer.style.textAlign = 'center';
        
            const detailedButton = document.createElement('a');
            detailedButton.href = `https://libgen.is/search.php?req=&open=0&res=25&view=detailed&phrase=1&column=def`;
            detailedButton.target = '_blank';
            detailedButton.textContent = '🔎 Open LibGen (Detailed View)';
            detailedButton.style = `
                background: ${theme === 'dark' ? '#555' : '#ddd'};
                color: ${theme === 'dark' ? '#eee' : '#000'};
                text-decoration: none;
                padding: 6px 12px;
                border-radius: 6px;
                display: inline-block;
                font-weight: bold;
            `;
        
            detailedButtonContainer.appendChild(detailedButton);
            linksContainer.appendChild(detailedButtonContainer);
        }
    }

    function debounce(fn, delay = 500) {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, delay);
        };
    }

    const debouncedRun = debounce(addLibgenLinks);
    const observer = new MutationObserver(debouncedRun);
    observer.observe(document.body, { childList: true, subtree: true });

    applyTheme();
    addLibgenLinks();
})();
