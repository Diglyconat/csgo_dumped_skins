// ==UserScript==
// @name         Cstrike`s Inventory Dumper Fixed + Gloves
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Dump skins + gloves + read WEAR/SEED, replace texture name with "SkinData"
// @match        https://inventory.cstrike.app/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const dumpBtn = document.createElement('button');
    dumpBtn.textContent = 'Dump Skin';
    Object.assign(dumpBtn.style, {
        position: 'fixed', top: '10px', right: '10px', zIndex: 9999,
        padding: '10px', background: '#fa4', border: 'none', cursor: 'pointer'
    });
    document.body.appendChild(dumpBtn);

    function getWearSeedFromDOM() {
        const container = document.querySelector('div.flex.items-center.gap-8');
        if (!container) return null;
        let wear = null, seed = null;
        container.querySelectorAll('div > div.text-sm.font-bold').forEach(el => {
            const label = el.textContent.trim().toUpperCase();
            const valueEl = el.nextElementSibling;
            if (valueEl) {
                if (label === 'WEAR') wear = parseFloat(valueEl.textContent.trim());
                if (label === 'SEED') seed = parseInt(valueEl.textContent.trim());
            }
        });
        return { wear, seed };
    }

    dumpBtn.onclick = async function() {
        try {
            const nameEl = document.querySelector('div.text-3xl') || document.querySelector('span.font-display.border-b-4');
            if (!nameEl) { alert('Не удалось найти название скина на странице'); return; }
            const originalName = nameEl.textContent.trim();

            const searchName = originalName
                .replace(/StatTrak™?\s*/i,'')
                .replace(/Souvenir\s*/i,'')
                .replace(/[★™]/g,'')
                .replace(/\|/g,' ')
                .replace(/\s+/g,' ')
                .trim()
                .toLowerCase();

            // Получаем texture
            const urlAll = 'https://raw.githubusercontent.com/Diglyconat/csgo_dumped_skins/main/all_info_for_skins';
            const textAll = await fetch(urlAll).then(r=>r.text());
            const lines = textAll.split('\n');

            let texture = null;
            for (let i=0;i<lines.length;i++){
                const line = lines[i].trim();
                if(line.toLowerCase().startsWith('name:')){
                    const nameInFile = line.slice(5).trim().replace(/\s+/g,' ').toLowerCase();
                    if(nameInFile === searchName){
                        for(let j=i+1;j<lines.length;j++){
                            const textureMatch = lines[j].match(/Texture:\s*([\w_]+)/i);
                            if(textureMatch){
                                texture = textureMatch[1];
                                break;
                            }
                            if(/^name:/i.test(lines[j])) break;
                        }
                        break;
                    }
                }
            }

            if(!texture){
                alert(`Не найден Texture для скина "${originalName}"`);
                return;
            }

            // Получаем блок скина из оружия или перчаток
            const urls = [
                'https://raw.githubusercontent.com/Diglyconat/csgo_dumped_skins/refs/heads/main/weaponskins_fixed',
                'https://raw.githubusercontent.com/Diglyconat/csgo_dumped_skins/refs/heads/main/glovesskins_fixed'
            ];

            let block = null;
            for (let url of urls) {
                const text = await fetch(url).then(r=>r.text());
                const match = text.match(new RegExp(texture+'[\\s\\S]*?\\}', 'g'));
                if(match){
                    block = match[0];
                    break;
                }
            }

            if(!block){ alert(`Не найден блок паттерна для texture "${texture}"`); return; }

            // Получаем seed и wear
            const domData = getWearSeedFromDOM();
            const inspected = window.InventorySimulator?.inspectedItem;
            const seed = domData?.seed ?? inspected?.seed ?? Math.floor(Math.random()*1001);
            const wear = domData?.wear ?? inspected?.wear ?? 0.0;

            // Подставляем seed и wear
            block = block.replace(/"wear_progress"\s*"\d+(?:\.\d+)?"/, `"wear_progress"\t\t"${wear}"`);
            block = block.replace(/"seed"\s*"\d+"/, `"seed"\t\t"${seed}"`);

            // Заменяем название texture на "SkinData"
            block = block.replace(new RegExp(`^${texture}`, 'm'), '"SkinData');

            // Подставляем has_stattrak если нужно
let isStatTrak = /StatTrak™/i.test(originalName);
if (!isStatTrak && inspected?.statTrak >= 0) {
    isStatTrak = true;
}

if (isStatTrak) {
    block = block.replace(/\}\s*$/, `\t"has_stattrak"\t\t"1"\n}`);
}



            // Сохраняем
            let fileName = originalName.replace(/[\\\/:*?"<>|]/g,''); // удаляем запрещённые символы
            fileName = fileName.replace(/[™★]/g,''); // удаляем ★ и ™
            fileName += '.txt';

            const blob = new Blob([block], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            setTimeout(()=>URL.revokeObjectURL(a.href),1000);

            alert(`Дамп готов!\nНазвание: ${originalName}\nTexture: ${texture}\nSeed: ${seed}\nWear: ${wear}`);
        } catch(e){
            alert('Ошибка: '+(e?.message||e));
            console.error(e);
        }
    };

})();
