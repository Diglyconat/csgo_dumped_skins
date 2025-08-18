// ==UserScript==
// @name         CS2 Skin Dumper (GitHub textures)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Dump skins with seed/wear extraction from GitHub repositories
// @match        https://inventory.cstrike.app/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // Кнопка
    const btn = document.createElement('button');
    btn.textContent = 'Dump Skin';
    Object.assign(btn.style, {
        position: 'fixed', top: '10px', right: '10px', zIndex: 9999,
        padding: '10px', background: '#fa4', border: 'none', cursor: 'pointer'
    });
    document.body.appendChild(btn);

    // ---------- Helpers ----------
    const log = [];
    function dbg(...args){ log.push(args.map(a=>String(a)).join(' ')); }
    function alertDebug(extra=''){ return; } // отключаем все debug alert

    function downloadTextFile(filename, content) {
        const safeFilename = filename.replace(/™/g, '');
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safeFilename;
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    }

    function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // ---------- Парсинг названия ----------
    function getSkinNameInfo() {
        let nameEl = document.querySelector('span.font-display.border-b-4');
        if (!nameEl) nameEl = document.querySelector('div.text-3xl, h1.text-4xl, h1.font-display');
        if (!nameEl) return null;

        const originalName = nameEl.textContent.trim();
        const isStattrak = /StatTrak/i.test(originalName);
        const isSouvenir = /Souvenir/i.test(originalName);

        let searchName = originalName
            .replace(/StatTrak™?\s*/i, '')
            .replace(/Souvenir\s*/i, '')
            .replace(/[™]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return { originalName, searchName, isStattrak, isSouvenir };
    }

    // ---------- Парсинг seed & wear ----------
    function getSeedWear() {
        let seedValue = null;
        let wearValue = null;

        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
            const t = (el.textContent || '').trim();
            if (/^(Pattern Template|Seed)$/i.test(t)) {
                const v1 = el.nextElementSibling?.textContent?.trim();
                if (v1 && /^\d+$/.test(v1)) seedValue = v1;
            }
            if (/^(Wear Rating|Wear)$/i.test(t)) {
                const v2 = el.nextElementSibling?.textContent?.trim();
                if (v2 && /^\d+(\.\d+)?$/.test(v2)) wearValue = v2;
            }
            if (seedValue && wearValue) break;
        }
        if (!seedValue) seedValue = String(Math.floor(Math.random()*1001));
        if (!wearValue) wearValue = '0.0';
        return { seed: seedValue, wear: wearValue };
    }

    async function fetchTextureName(searchName) {
        const url = 'https://raw.githubusercontent.com/Diglyconat/csgo_dumped_skins/refs/heads/main/all_info_for_skins';
        const text = await fetch(url).then(r => r.text());
        const re = new RegExp(`Name:\\s*${escapeReg(searchName)}[\\s\\S]*?Texture:\\s*([\\w_]+)`, 'i');
        const match = text.match(re);
        if (!match) return null;
        return match[1];
    }

    async function fetchSkinBlock(texture) {
        const url = 'https://raw.githubusercontent.com/Diglyconat/csgo_dumped_skins/refs/heads/main/weaponskins_fixed';
        const text = await fetch(url).then(r => r.text());
        const patRe = new RegExp(`${escapeReg(texture)}[\\s\\S]*?\\}`, 'g');
        const match = text.match(patRe);
        if (!match) return null;
        return match[0];
    }

    btn.onclick = async function() {
        log.length = 0;
        try {
            const info = getSkinNameInfo();
            if (!info) { alert('Не удалось найти название скина на странице'); return; }
            const { originalName, searchName, isStattrak } = info;
            const { seed, wear } = getSeedWear();

            const texture = await fetchTextureName(searchName);
            if (!texture) { alert(`Не найден Texture для скина "${searchName}"`); return; }

            let block = await fetchSkinBlock(texture);
            if (!block) { alert(`Не найден блок паттерна для texture "${texture}"`); return; }

            block = block.replace(/"wear_progress"\s*"\d+(?:\.\d+)?"/, `"wear_progress"\t\t"${wear}"`);
            block = block.replace(/"seed"\s*"\d+"/, `"seed"\t\t"${seed}"`);
            block = block.replace(new RegExp(`${escapeReg(texture)}`, 'g'), `"SkinData`);
            if (isStattrak) block = block.replace(/\}\s*$/, `\t"has_stattrak"\t\t"1"\n}`);

            const fileName = originalName.replace(/[\\\/:*?"<>|]/g, '') + '.txt';
            downloadTextFile(fileName, block);

            alert('Дамп готов!\nНазвание: ' + originalName + '\nTexture: ' + texture + '\nSeed: ' + seed + '\nWear: ' + wear);

        } catch(e) {
            alert('Ошибка: ' + (e && e.message ? e.message : e));
        }
    };
})();
