// キャンバスとコンテキストの取得
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const pCanvas = document.getElementById('prestigeCanvas');
        const pCtx = pCanvas.getContext('2d');

        // 画面要素
        const mainScreen = document.getElementById('main-screen');
        const prestigeScreen = document.getElementById('prestige-screen');
        const mobileShopToggle = document.getElementById('mobile-shop-toggle');
        const mobileTreeInfoToggle = document.getElementById('mobile-tree-info-toggle');
        const mobileCountDisplay = document.getElementById('mobile-count');
        const mobileJarsDisplay = document.getElementById('mobile-jars');
        const mobileLayout = window.matchMedia('(max-width: 680px)');
        const isMobileLayout = () => mobileLayout.matches;

        // UI表示用要素
        const countDisplay = document.getElementById('count');
        const maxCountDisplay = document.getElementById('max-count');
        const jarDisplay = document.getElementById('jar-count');
        const conditionText = document.getElementById('condition-text');
        const nutrientLvlDisplay = document.getElementById('nutrient-level');
        const nutrientCostDisplay = document.getElementById('nutrient-cost');
        const cultureLvlDisplay = document.getElementById('culture-level');
        const cultureCostDisplay = document.getElementById('culture-cost');
        const buyNutrientBtn = document.getElementById('buy-nutrient');
        const buyCultureBtn = document.getElementById('buy-culture');

        const totalJarsDisplay = document.getElementById('total-jars');
        const tpDisplay = document.getElementById('tp-count');
        const nextTpJarsDisplay = document.getElementById('next-tp-jars');
        const prestigeBtn = document.getElementById('prestige-trigger');
        const pendingTpDisplay = document.getElementById('pending-tp');

        const mobileHudObserver = new MutationObserver(() => {
            mobileCountDisplay.textContent = `${countDisplay.textContent} / ${maxCountDisplay.textContent}`;
            mobileJarsDisplay.textContent = jarDisplay.textContent;
        });
        mobileHudObserver.observe(countDisplay, { childList: true, characterData: true, subtree: true });
        mobileHudObserver.observe(maxCountDisplay, { childList: true, characterData: true, subtree: true });
        mobileHudObserver.observe(jarDisplay, { childList: true, characterData: true, subtree: true });
        mobileCountDisplay.textContent = `${countDisplay.textContent} / ${maxCountDisplay.textContent}`;
        mobileJarsDisplay.textContent = jarDisplay.textContent;
        
        // ノード詳細UI
        const detailPanel = document.getElementById('node-detail-panel');
        const nodeNameDisp = document.getElementById('node-name');
        const nodeDescDisp = document.getElementById('node-desc');
        const nodeLvlDisp = document.getElementById('node-level');
        const nodeCostDisp = document.getElementById('node-cost');
        const nodeUpgradeBtn = document.getElementById('node-upgrade-btn');

        // キャンバスサイズ初期化
        canvas.width = pCanvas.width = window.innerWidth;
        canvas.height = pCanvas.height = window.innerHeight;

        // --- ゲーム状態変数 ---
        let currentScreen = 'main'; // 'main' か 'prestige'
        let cells = [];
        let MAX_CELLS = 200;
        let stockedJars = 0;       
        let isStocking = false;     

        let nutrientLevel = 0;
        let cultureFluidLevel = 0;
        let nutrientCost = 1;
        let cultureFluidCost = 1;
        let lastAutoGrowTime = performance.now(); 

        let totalJars = 0;        
        let prestigePoints = 0;   
        let loopCount = 0;        
        let pointerRangeX = 0;
        let pointerRangeY = 0;
        let pointerRangeVisible = false;
        let pointerRangeTimeout = null;
        
        // Cookie Clickerの永久強化・分岐・割引・オフライン生産などを細胞向けに再設計。
        const skills = {
            packing: { id: 'packing', name: '高速瓶詰め', desc: '瓶詰めの移動演出を省略する。', lvl: 0, max: 1, cost: 1, requires: [], gx: 0, gy: 0, x: 0, y: 0 },
            clickRange: { id: 'clickRange', name: '広域感覚', desc: '細胞をクリックできる範囲が25% / Lv広がる。範囲内の細胞をまとめてクリックする。', lvl: 0, max: 3, cost: 4, requires: ['packing'], gx: -1, gy: 0, x: 0, y: 0 },
            grow: { id: 'grow', name: '細胞膜強化', desc: '細胞の成長速度 +30% / Lv。', lvl: 0, max: 5, cost: 1, requires: ['packing'], gx: -1, gy: -1, x: 0, y: 0 },
            double: { id: 'double', name: '多重収穫', desc: '瓶詰め時に25% / Lvの確率で瓶をもう1個獲得。', lvl: 0, max: 3, cost: 2, requires: ['grow'], gx: -2, gy: -2, x: 0, y: 0 },
            burst: { id: 'burst', name: '異常繁殖', desc: '自動増殖時、10% / Lvの確率で発生数が3倍。', lvl: 0, max: 1, cost: 3, requires: ['grow'], gx: -1, gy: -2, x: 0, y: 0 },
            click1: { id: 'click1', name: '分裂触媒 I', desc: 'クリック分裂時の追加細胞 +1。', lvl: 0, max: 1, cost: 3, requires: ['packing'], gx: 0, gy: -1, x: 0, y: 0 },
            click2: { id: 'click2', name: '分裂触媒 II', desc: 'クリック分裂時の追加細胞 +2。', lvl: 0, max: 1, cost: 12, requires: ['click1'], gx: 0, gy: -2, x: 0, y: 0 },
            click3: { id: 'click3', name: '連鎖分裂', desc: 'クリック分裂時、25%の確率で細胞数がさらに倍増。', lvl: 0, max: 1, cost: 42, requires: ['click2'], gx: 0, gy: -3, x: 0, y: 0 },
            click4: { id: 'click4', name: '超連鎖分裂', desc: '連鎖分裂の確率を50%にする。', lvl: 0, max: 1, cost: 130, requires: ['click3'], gx: 0, gy: -4, x: 0, y: 0 },
            auto1: { id: 'auto1', name: '培養神経 I', desc: '毎秒の自動増殖数 +1（培養液が必要）。', lvl: 0, max: 1, cost: 3, requires: ['packing'], gx: 1, gy: -1, x: 0, y: 0 },
            auto2: { id: 'auto2', name: '培養神経 II', desc: '毎秒の自動増殖数 +3（培養液が必要）。', lvl: 0, max: 1, cost: 14, requires: ['auto1'], gx: 1, gy: -2, x: 0, y: 0 },
            auto3: { id: 'auto3', name: '増殖周期短縮', desc: '自動増殖の間隔を1.0秒から0.6秒に短縮。', lvl: 0, max: 1, cost: 45, requires: ['auto2'], gx: 1, gy: -3, x: 0, y: 0 },
            auto4: { id: 'auto4', name: '自己増殖', desc: '培養液がなくても毎秒2個の細胞を生成。', lvl: 0, max: 1, cost: 145, requires: ['auto3'], gx: 1, gy: -4, x: 0, y: 0 },
            jar1: { id: 'jar1', name: '瓶詰め効率 I', desc: '瓶詰めで必ず追加の瓶を1個獲得。', lvl: 0, max: 1, cost: 7, requires: ['double'], gx: -3, gy: -1, x: 0, y: 0 },
            jar2: { id: 'jar2', name: '瓶詰め効率 II', desc: '瓶詰めで必ず追加の瓶を2個獲得。', lvl: 0, max: 1, cost: 30, requires: ['jar1'], gx: -4, gy: -1, x: 0, y: 0 },
            jar3: { id: 'jar3', name: '高純度細胞', desc: '瓶詰めで獲得する瓶の総数が2倍になる。', lvl: 0, max: 1, cost: 105, requires: ['jar2'], gx: -5, gy: -1, x: 0, y: 0 },
            discount1: { id: 'discount1', name: '研究割引 I', desc: 'ショップの商品価格を20%引き（最低1個）。', lvl: 0, max: 1, cost: 5, requires: ['auto1'], gx: 2, gy: -1, x: 0, y: 0 },
            discount2: { id: 'discount2', name: '研究割引 II', desc: 'ショップの商品価格をさらに20%引き。', lvl: 0, max: 1, cost: 23, requires: ['discount1'], gx: 3, gy: -1, x: 0, y: 0 },
            discount3: { id: 'discount3', name: '研究割引 III', desc: 'ショップの商品価格を合計60%引き。', lvl: 0, max: 1, cost: 85, requires: ['discount2'], gx: 4, gy: -1, x: 0, y: 0 },
            starter1: { id: 'starter1', name: '培養スターター I', desc: '転生時、栄養剤Lv1と培養液Lv1から開始。', lvl: 0, max: 1, cost: 8, requires: ['auto1'], gx: 2, gy: 0, x: 0, y: 0 },
            starter2: { id: 'starter2', name: '培養スターター II', desc: '転生時、栄養剤Lv3と培養液Lv3から開始。', lvl: 0, max: 1, cost: 38, requires: ['starter1'], gx: 3, gy: 0, x: 0, y: 0 },
            starter3: { id: 'starter3', name: '培養スターター III', desc: '転生時、栄養剤Lv5と培養液Lv5から開始。', lvl: 0, max: 1, cost: 150, requires: ['starter2'], gx: 4, gy: 0, x: 0, y: 0 },
            offline1: { id: 'offline1', name: '休眠代謝 I', desc: 'ゲームを閉じている間、1分あたり瓶1個（上限30分）。', lvl: 0, max: 1, cost: 10, requires: ['packing'], gx: -1, gy: 1, x: 0, y: 0 },
            offline2: { id: 'offline2', name: '休眠代謝 II', desc: 'オフライン報酬が毎分3個、上限2時間になる。', lvl: 0, max: 1, cost: 45, requires: ['offline1'], gx: -2, gy: 1, x: 0, y: 0 },
            offline3: { id: 'offline3', name: '休眠代謝 III', desc: 'オフライン報酬が毎分8個、上限8時間になる。', lvl: 0, max: 1, cost: 175, requires: ['offline2'], gx: -3, gy: 1, x: 0, y: 0 },
            inherit1: { id: 'inherit1', name: '遺伝子記憶 I', desc: '転生後も栄養剤と培養液のレベルをそれぞれ1つ引き継ぐ。', lvl: 0, max: 1, cost: 15, requires: ['packing'], gx: 0, gy: 1, x: 0, y: 0 },
            inherit2: { id: 'inherit2', name: '遺伝子記憶 II', desc: '引き継ぐショップレベルがそれぞれ3になる。', lvl: 0, max: 1, cost: 65, requires: ['inherit1'], gx: 0, gy: 2, x: 0, y: 0 },
            inherit3: { id: 'inherit3', name: '遺伝子記憶 III', desc: '引き継ぐショップレベルがそれぞれ5になる。', lvl: 0, max: 1, cost: 220, requires: ['inherit2'], gx: 0, gy: 3, x: 0, y: 0 },
            capacity1: { id: 'capacity1', name: '柔軟な培養槽 I', desc: '瓶詰めに必要な細胞数を10%減らす。', lvl: 0, max: 1, cost: 9, requires: ['packing'], gx: 1, gy: 1, x: 0, y: 0 },
            capacity2: { id: 'capacity2', name: '柔軟な培養槽 II', desc: '瓶詰めに必要な細胞数を合計20%減らす。', lvl: 0, max: 1, cost: 50, requires: ['capacity1'], gx: 2, gy: 1, x: 0, y: 0 },
            capacity3: { id: 'capacity3', name: '柔軟な培養槽 III', desc: '瓶詰めに必要な細胞数を合計30%減らす。', lvl: 0, max: 1, cost: 190, requires: ['capacity2'], gx: 3, gy: 1, x: 0, y: 0 },
            mutation1: { id: 'mutation1', name: '突然変異 I', desc: '自動増殖で20%の確率で追加1個を生成。', lvl: 0, max: 1, cost: 18, requires: ['burst'], gx: -2, gy: 0, x: 0, y: 0 },
            mutation2: { id: 'mutation2', name: '突然変異 II', desc: '自動増殖で35%の確率で追加3個を生成。', lvl: 0, max: 1, cost: 70, requires: ['mutation1'], gx: -3, gy: 0, x: 0, y: 0 },
            mutationSignal: { id: 'mutationSignal', name: '変異誘導', desc: 'クリック突然変異の発生率 +2.5% / Lv。', lvl: 0, max: 3, cost: 25, requires: ['mutation2'], gx: -4, gy: 0, x: 0, y: 0 },
            mutationStasis: { id: 'mutationStasis', name: '変異保全', desc: '突然変異細胞が消えるまでの時間 +8秒 / Lv。', lvl: 0, max: 2, cost: 55, requires: ['mutationSignal'], gx: -5, gy: 0, x: 0, y: 0 },
            mutationCulture: { id: 'mutationCulture', name: '変異培養皿', desc: '同時に存在できる突然変異細胞 +1 / Lv。', lvl: 0, max: 2, cost: 60, requires: ['mutationSignal'], gx: -4, gy: 1, x: 0, y: 0 },
            mutationFilter: { id: 'mutationFilter', name: '変異選別', desc: '悪性の突然変異効果を50%の確率で良性効果に置き換える。', lvl: 0, max: 1, cost: 140, requires: ['mutationStasis', 'mutationCulture'], gx: -5, gy: 1, x: 0, y: 0 },
            bonus1: { id: 'bonus1', name: '共生作用', desc: 'クリック分裂と自動増殖の追加生成数が1.5倍。', lvl: 0, max: 1, cost: 100, requires: ['click2', 'auto2'], gx: 2, gy: -3, x: 0, y: 0 },
            bonus2: { id: 'bonus2', name: '完全共生', desc: 'クリック分裂と自動増殖の追加生成数が2倍。', lvl: 0, max: 1, cost: 350, requires: ['bonus1'], gx: 3, gy: -3, x: 0, y: 0 }
        };
        let selectedNodeId = null;
        const treeCamera = { x: 0, y: 0, zoom: 0.77 };
        function initNodePositions() {
            Object.values(skills).forEach(node => {
                node.x = node.gx * 165;
                node.y = node.gy * 145;
            });
        }
        function hasSkill(id) { return skills[id] && skills[id].lvl > 0; }
        function nextNodeCost(node) { return node.cost * (node.id === 'grow' || node.id === 'double' ? Math.pow(2, node.lvl) : 1); }
        function totalSpentTp() {
            return Object.values(skills).reduce((sum, node) => {
                for (let i=0;i<node.lvl;i++) sum += node.cost * (node.id === 'grow' || node.id === 'double' ? Math.pow(2,i) : 1);
                return sum;
            }, 0);
        }
        // 旧セーブの取得済TPを改変しないように、獲得済TPの累計を独立管理。
        let earnedTpLifetime = 0;
        function pendingPrestigeTp() { return Math.max(0, calculateTotalTpFromJars(totalJars) - earnedTpLifetime); }
        function effectiveMaxCells() {
            const reduce = hasSkill('capacity3') ? .3 : hasSkill('capacity2') ? .2 : hasSkill('capacity1') ? .1 : 0;
            const base = 200 + loopCount * 50;
            return Math.max(40, Math.ceil(base * (1 - reduce)));
        }
        function cellBaseRadius() { return isMobileLayout() ? 38 : 28; }
        function updateCapacity() {
            MAX_CELLS = effectiveMaxCells();
            maxCountDisplay.textContent = MAX_CELLS;
            conditionText.textContent = `${MAX_CELLS}個に達すると瓶詰めされます`;
        }
        function getDiscount() { return hasSkill('discount3') ? .6 : hasSkill('discount2') ? .4 : hasSkill('discount1') ? .2 : 0; }
        function addJarReward(amount) {
            stockedJars += amount; totalJars += amount;
            jarDisplay.textContent = stockedJars;
            updateShopUI(); updatePrestigeUI(); saveToLocalStorage();
        }

        const jarPos = { x: canvas.width - 100, y: canvas.height - 120, width: 80, height: 100 };
        function getHslString(h, s, l) { return `hsl(${h}, ${s}%, ${l}%)`; }

        // 突然変異は「クリックによって新規生成された細胞」にのみ付与する。
        const MUTATION_CHANCE = 0.055; // クリック1回につき5.5%（対象は分裂した子細胞のみ）
        const MUTATION_LIFETIME = 22000;
        const MUTATION_EFFECTS = [
            {id:'fertile',name:'増殖核',kind:'good',desc:'25秒間、クリック分裂の生成数 +3'},
            {id:'reach',name:'感覚拡張',kind:'good',desc:'30秒間、クリック判定半径が2.2倍'},
            {id:'frenzy',name:'過剰分裂',kind:'good',desc:'12秒間、クリック分裂で生成される細胞が2倍'},
            {id:'gift',name:'栄養結晶',kind:'good',desc:'瓶を即座に2個獲得'},
            {id:'plague',name:'細胞毒',kind:'bad',desc:'15秒間、クリック分裂で生成される細胞が半分（最低2個）'},
            {id:'shrink',name:'神経萎縮',kind:'bad',desc:'20秒間、クリック判定半径が0.55倍'},
            {id:'drain',name:'資源汚染',kind:'bad',desc:'所持している瓶の20%を失う（最大15個）'},
            {id:'wild',name:'不安定核',kind:'wild',desc:'良い効果か悪い効果がランダムで発生'}
        ];
        const MUTATION_VISUALS = [
            {shape:'orbit',primary:'#64ff8b',secondary:'#eafff0',symbol:'✦',orbs:4,spin:.8},
            {shape:'halo',primary:'#58eaff',secondary:'#2038ff',symbol:'◎',orbs:0,spin:.4},
            {shape:'spikes',primary:'#ffdd55',secondary:'#ff7a18',symbol:'✳',orbs:8,spin:1.25},
            {shape:'diamond',primary:'#d998ff',secondary:'#72f7ff',symbol:'◆',orbs:4,spin:-.65},
            {shape:'scan',primary:'#ff547b',secondary:'#ffe2ea',symbol:'☣',orbs:2,spin:.95},
            {shape:'cross',primary:'#ff8a45',secondary:'#ffd4a6',symbol:'⊗',orbs:6,spin:-1.05},
            {shape:'rings',primary:'#b37bff',secondary:'#fff5a8',symbol:'☠',orbs:3,spin:.55},
            {shape:'petals',primary:'#ffffff',secondary:'#79ffca',symbol:'?',orbs:7,spin:1.45},
            {shape:'triangle',primary:'#ff6ef3',secondary:'#52fffc',symbol:'△',orbs:3,spin:-.9},
            {shape:'square',primary:'#9eff5a',secondary:'#fffb5c',symbol:'□',orbs:4,spin:.7},
            {shape:'comet',primary:'#ffa6e8',secondary:'#7afff5',symbol:'✧',orbs:5,spin:1.7},
            {shape:'eye',primary:'#f5ff6b',secondary:'#ff6b6b',symbol:'◉',orbs:0,spin:.35}
        ];
        const mutationEffects = {}; // id -> 終了時刻。転生時はリセット
        const mutationEffectDurations = {};
        const mutationParticles = [];
        let mutationToastUntil = 0;
        let lastEffectTimerUpdate = 0;
        const effectTimerNames = { fertile: '増殖核', reach: '感覚拡張', frenzy: '過剰分裂', plague: '細胞毒', shrink: '神経萎縮' };
        const effectTimerColors = { fertile: '#64ff8b', reach: '#58eaff', frenzy: '#ffdd55', plague: '#ff547b', shrink: '#ff8a45' };
        function randomItem(items) { return items[Math.floor(Math.random()*items.length)]; }
        function mutationChance() { return MUTATION_CHANCE + skills.mutationSignal.lvl * 0.025; }
        function mutationLifetime() { return MUTATION_LIFETIME + skills.mutationStasis.lvl * 8000; }
        function maxMutationCells() { return 3 + skills.mutationCulture.lvl; }
        function pickMutationEffect() {
            return randomItem(MUTATION_EFFECTS);
        }
        function resolveMutationEffect(effect) {
            const finalEffects=MUTATION_EFFECTS.filter(m=>m.id!=='wild');
            const resolved=effect.id==='wild' ? randomItem(finalEffects) : effect;
            if(hasSkill('mutationFilter') && resolved.kind==='bad' && Math.random()<0.5) {
                return randomItem(MUTATION_EFFECTS.filter(m=>m.kind==='good'));
            }
            return resolved;
        }
        function modifier(id) { return (mutationEffects[id] || 0) > Date.now(); }
        function clickRangeMultiplier() {
            return (modifier('reach') ? 2.2 : 1) * (modifier('shrink') ? .55 : 1) * (1 + skills.clickRange.lvl * .25);
        }
        function clearMutationEffects() {
            Object.keys(mutationEffects).forEach(k => delete mutationEffects[k]);
            Object.keys(mutationEffectDurations).forEach(k => delete mutationEffectDurations[k]);
            mutationParticles.length=0;
            document.getElementById('effect-timers').replaceChildren();
        }
        function renderEffectTimers(now = Date.now()) {
            const container = document.getElementById('effect-timers');
            const active = Object.keys(effectTimerNames).filter(id => mutationEffects[id] > now);
            const existing = new Map([...container.children].map(el => [el.dataset.effect, el]));
            active.forEach(id => {
                let item = existing.get(id);
                if (!item) {
                    item = document.createElement('div');
                    item.className = 'effect-timer';
                    item.dataset.effect = id;
                    item.style.setProperty('--effect-color', effectTimerColors[id]);
                    const svgNS = 'http://www.w3.org/2000/svg';
                    const svg = document.createElementNS(svgNS, 'svg');
                    svg.setAttribute('class', 'effect-clock'); svg.setAttribute('viewBox', '0 0 64 64');
                    const face = document.createElementNS(svgNS, 'circle');
                    face.setAttribute('class', 'clock-face'); face.setAttribute('cx', '32'); face.setAttribute('cy', '32'); face.setAttribute('r', '28'); svg.append(face);
                    for (let tick = 0; tick < 12; tick++) {
                        const angle = tick * Math.PI / 6 - Math.PI / 2;
                        const mark = document.createElementNS(svgNS, 'line');
                        mark.setAttribute('class', 'clock-tick');
                        mark.setAttribute('x1', (32 + Math.cos(angle) * 23).toFixed(2)); mark.setAttribute('y1', (32 + Math.sin(angle) * 23).toFixed(2));
                        mark.setAttribute('x2', (32 + Math.cos(angle) * 26).toFixed(2)); mark.setAttribute('y2', (32 + Math.sin(angle) * 26).toFixed(2)); svg.append(mark);
                    }
                    const trail = document.createElementNS(svgNS, 'path'); trail.setAttribute('class', 'clock-trail'); svg.append(trail);
                    const hand = document.createElementNS(svgNS, 'line'); hand.setAttribute('class', 'clock-hand'); hand.setAttribute('x1', '32'); hand.setAttribute('y1', '32'); hand.setAttribute('y2', '9'); svg.append(hand);
                    const center = document.createElementNS(svgNS, 'circle'); center.setAttribute('class', 'clock-center'); center.setAttribute('cx', '32'); center.setAttribute('cy', '32'); center.setAttribute('r', '2.5'); svg.append(center);
                    const text = document.createElement('div');
                    const name = document.createElement('div'); name.className = 'effect-timer-name';
                    const time = document.createElement('div'); time.className = 'effect-timer-time';
                    text.append(name, time); item.append(svg, text); container.append(item);
                    item._timerParts = { trail, hand, name, time };
                }
                existing.delete(id);
                const remaining = Math.max(0, mutationEffects[id] - now);
                const duration = mutationEffectDurations[id] || remaining;
                const progress = Math.min(.9999, Math.max(0, 1 - remaining / duration));
                const angle = progress * Math.PI * 2 - Math.PI / 2;
                const x = 32 + 25 * Math.cos(angle), y = 32 + 25 * Math.sin(angle);
                const largeArc = progress > .5 ? 1 : 0;
                const { trail, hand, name, time } = item._timerParts;
                trail.setAttribute('d', progress > 0 ? `M 32 32 L 32 7 A 25 25 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z` : '');
                hand.setAttribute('x2', (32 + 22 * Math.cos(angle)).toFixed(2));
                hand.setAttribute('y2', (32 + 22 * Math.sin(angle)).toFixed(2));
                name.textContent = effectTimerNames[id];
                const seconds = Math.ceil(remaining / 1000);
                time.textContent = seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}秒`;
                item.setAttribute('aria-label', `${effectTimerNames[id]}、残り${time.textContent}`);
            });
            existing.forEach(item => item.remove());
        }
        function showMutationToast(message,color='#9ff') {
            const el=document.getElementById('mutation-toast');
            el.textContent=message; el.style.color=color; el.style.opacity='1'; mutationToastUntil=performance.now()+2600;
        }
        function mutationBurst(x,y,color) {
            for(let i=0;i<22;i++) {const a=Math.random()*Math.PI*2,s=2+Math.random()*5;
                mutationParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:42,color});}
        }
        function pickMutation(cell) {
            if (Math.random()>=mutationChance() || cells.filter(c=>c.mutation).length>=maxMutationCells()) return;
            const effect=pickMutationEffect();
            const visual=randomItem(MUTATION_VISUALS);
            cell.mutation=effect.id;
            cell.mutationVisual={...visual,phase:Math.random()*Math.PI*2};
            cell.mutationBorn=performance.now();
            cell.color=visual.primary;
        }
        function collectMutation(cell) {
            const original=MUTATION_EFFECTS.find(m=>m.id===cell.mutation);
            if(!original)return;
            const type=resolveMutationEffect(original);
            const visual=cell.mutationVisual || randomItem(MUTATION_VISUALS);
            mutationBurst(cell.x,cell.y,visual.primary);
            if (type.id==='gift') addJarReward(2);
            else if (type.id==='drain') {
                const lost=Math.min(15,Math.ceil(stockedJars*.2)); stockedJars-=lost;
                jarDisplay.textContent=stockedJars; updateShopUI();saveToLocalStorage();
                showMutationToast(`🧬 ${original.name} → ${type.name}: 瓶 -${lost}個`,visual.primary);
            } else {
                const seconds={fertile:25,reach:30,frenzy:12,plague:15,shrink:20}[type.id];
                mutationEffects[type.id]=Date.now()+seconds*1000;
                mutationEffectDurations[type.id]=seconds*1000;
                renderEffectTimers();
            }
            if(type.id!=='drain')showMutationToast(`🧬 ${original.name} → ${type.name}！ ${type.desc}`,visual.primary);
        }
        function drawMutationParticles() {
            for(let i=mutationParticles.length-1;i>=0;i--){const p=mutationParticles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy*=.97;p.life--;
                ctx.globalAlpha=Math.max(0,p.life/42);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                if(p.life<=0)mutationParticles.splice(i,1);
            }
        }
        function drawMutationVisual(cell) {
            const v=cell.mutationVisual || MUTATION_VISUALS[0];
            const t=performance.now()/300 + v.phase;
            const pulse=7+Math.sin(t)*3;
            const outer=cell.radius+pulse;
            ctx.save();
            ctx.shadowColor=v.primary; ctx.shadowBlur=22;
            ctx.strokeStyle=v.primary; ctx.fillStyle=v.primary; ctx.lineWidth=3;

            if(v.shape==='spikes'){
                ctx.beginPath();
                for(let k=0;k<18;k++){
                    const a=t*.35+k*Math.PI/9;
                    const r=cell.radius+(k%2?8:18);
                    const x=cell.x+Math.cos(a)*r, y=cell.y+Math.sin(a)*r;
                    if(k===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
                }
                ctx.closePath(); ctx.stroke();
            } else if(v.shape==='diamond'){
                ctx.save(); ctx.translate(cell.x,cell.y); ctx.rotate(t*.45);
                ctx.strokeRect(-outer*.72,-outer*.72,outer*1.44,outer*1.44);
                ctx.restore();
            } else if(v.shape==='scan'){
                ctx.beginPath(); ctx.arc(cell.x,cell.y,outer,0,Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cell.x-outer,cell.y+Math.sin(t*3)*outer*.55);
                ctx.lineTo(cell.x+outer,cell.y+Math.sin(t*3)*outer*.55); ctx.stroke();
            } else if(v.shape==='cross'){
                for(let k=0;k<4;k++){
                    const a=t*.4+k*Math.PI/2;
                    ctx.beginPath(); ctx.moveTo(cell.x+Math.cos(a)*(cell.radius+4),cell.y+Math.sin(a)*(cell.radius+4));
                    ctx.lineTo(cell.x+Math.cos(a)*(cell.radius+22),cell.y+Math.sin(a)*(cell.radius+22)); ctx.stroke();
                }
            } else if(v.shape==='rings'){
                for(let k=0;k<3;k++){ctx.globalAlpha=.85-k*.2;ctx.beginPath();ctx.arc(cell.x,cell.y,cell.radius+6+k*7+Math.sin(t+k)*2,0,Math.PI*2);ctx.stroke();}
                ctx.globalAlpha=1;
            } else if(v.shape==='petals'){
                for(let k=0;k<7;k++){
                    const a=t*.5+k*Math.PI*2/7;
                    ctx.beginPath();ctx.ellipse(cell.x+Math.cos(a)*(cell.radius+9),cell.y+Math.sin(a)*(cell.radius+9),4,10,a,0,Math.PI*2);ctx.stroke();
                }
            } else if(v.shape==='triangle'){
                ctx.save();ctx.translate(cell.x,cell.y);ctx.rotate(t*.5);
                ctx.beginPath();
                for(let k=0;k<3;k++){const a=-Math.PI/2+k*Math.PI*2/3; const x=Math.cos(a)*outer, y=Math.sin(a)*outer; if(k===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);}
                ctx.closePath();ctx.stroke();ctx.restore();
            } else if(v.shape==='square'){
                ctx.save();ctx.translate(cell.x,cell.y);ctx.rotate(t*.45);
                ctx.strokeRect(-outer*.62,-outer*.62,outer*1.24,outer*1.24);
                ctx.restore();
                ctx.beginPath();ctx.arc(cell.x,cell.y,outer*.72,0,Math.PI*2);ctx.stroke();
            } else if(v.shape==='comet'){
                ctx.beginPath();ctx.arc(cell.x,cell.y,outer,0,Math.PI*2);ctx.stroke();
                for(let k=0;k<3;k++){
                    const a=t*.8+k*Math.PI*2/3;
                    ctx.beginPath();ctx.moveTo(cell.x+Math.cos(a)*outer,cell.y+Math.sin(a)*outer);
                    ctx.quadraticCurveTo(cell.x+Math.cos(a-.45)*(outer+20),cell.y+Math.sin(a-.45)*(outer+20),cell.x+Math.cos(a-.9)*(outer+5),cell.y+Math.sin(a-.9)*(outer+5));ctx.stroke();
                }
            } else if(v.shape==='eye'){
                ctx.beginPath();ctx.ellipse(cell.x,cell.y,outer,outer*.55,Math.sin(t)*.25,0,Math.PI*2);ctx.stroke();
                ctx.beginPath();ctx.arc(cell.x,cell.y,5+Math.sin(t*2)*2,0,Math.PI*2);ctx.fill();
            } else {
                ctx.beginPath();ctx.arc(cell.x,cell.y,outer,0,Math.PI*2);ctx.stroke();
            }

            for(let k=0;k<(v.orbs||0);k++){
                const a=t*v.spin+k*Math.PI*2/v.orbs;
                ctx.beginPath();ctx.arc(cell.x+Math.cos(a)*(cell.radius+11),cell.y+Math.sin(a)*(cell.radius+11),3,0,Math.PI*2);
                ctx.fillStyle=k%2?v.secondary:v.primary;ctx.fill();
            }
            ctx.shadowBlur=0;ctx.fillStyle='#091018';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v.symbol,cell.x,cell.y);
            ctx.restore();
        }
        // --- 細胞オブジェクト ---
        class Cell {
            constructor(x, y, radius, h, s, l, vx, vy) {
                this.x = x; this.y = y;
                this.baseRadius = radius; this.radius = radius * 0.4; 
                this.h = h; this.s = s; this.l = l; 
                this.color = getHslString(this.h, this.s, this.l);
                this.vx = vx; this.vy = vy; this.friction = 0.96;
                this.isGrowing = true; 
                this.growthRate = 0.5 * (1 + skills.grow.lvl * 0.3); 
                this.markedForRemoval = false;
            }
            draw() {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color; ctx.fill();
                if (this.mutation) {
                    drawMutationVisual(this);
                }
                if (this.isGrowing) {
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.1})`;
                    ctx.lineWidth = 1; ctx.stroke();
                }
            }
            update() {
                if (isStocking) {
                    const targetX = jarPos.x + jarPos.width / 2; const targetY = jarPos.y;
                    const dx = targetX - this.x; const dy = targetY - this.y; const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 5) {
                        const speed = (MAX_CELLS - cells.length) * 0.02 + 2; const angle = Math.atan2(dy, dx);
                        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                        this.x += this.vx; this.y += this.vy;
                    } else { this.markedForRemoval = true; }
                    return; 
                }
                if(this.mutation && performance.now()-this.mutationBorn > mutationLifetime()){
                    this.mutation=null;this.mutationVisual=null;this.color=getHslString(this.h,this.s,this.l);
                }
                this.x += this.vx; this.y += this.vy; this.vx *= this.friction; this.vy *= this.friction;
                if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -1; }
                if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx *= -1; }
                if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -1; }
                if (this.y + this.radius > canvas.height) { this.y = canvas.height - this.radius; this.vy *= -1; }

                if (this.isGrowing) {
                    this.radius += this.growthRate;
                    if (this.radius >= this.baseRadius) { this.radius = this.baseRadius; this.isGrowing = false; }
                }
            }
            split() {
                const angleStep = Math.random() * Math.PI * 2; const count = 2 + nutrientLevel + (hasSkill('click2') ? 3 : hasSkill('click1') ? 1 : 0); const speed = 6; const newCells = [];
                for (let i = 0; i < count; i++) {
                    const angle = angleStep + (i * (Math.PI * 2) / count); const offset = this.radius * 0.4;
                    const nextH = (this.h + (Math.random() - 0.5) * 30) % 360;
                    newCells.push(new Cell(this.x + Math.cos(angle) * offset, this.y + Math.sin(angle) * offset, this.baseRadius, nextH, this.s, this.l, Math.cos(angle) * speed, Math.sin(angle) * speed));
                }
                if (hasSkill('click3') && Math.random() < (hasSkill('click4') ? .5 : .25)) {
                    const extra = [...newCells]; newCells.push(...extra.map(c => new Cell(c.x, c.y, c.baseRadius, c.h, c.s, c.l, -c.vx, -c.vy)));
                }
                if (hasSkill('bonus2') || hasSkill('bonus1')) {
                    const bonus = Math.floor((newCells.length-1) * (hasSkill('bonus2') ? 1 : .5));
                    for(let i=0;i<bonus;i++) newCells.push(new Cell(this.x,this.y,this.baseRadius,this.h,this.s,this.l,(Math.random()-.5)*8,(Math.random()-.5)*8));
                }
                if(modifier('fertile')) for(let i=0;i<3;i++)newCells.push(new Cell(this.x,this.y,this.baseRadius,this.h,this.s,this.l,(Math.random()-.5)*12,(Math.random()-.5)*12));
                if(modifier('frenzy'))newCells.push(...newCells.map(c=>new Cell(c.x,c.y,c.baseRadius,c.h,c.s,c.l,-c.vx,-c.vy)));
                if(modifier('plague'))newCells.length=Math.max(2,Math.floor(newCells.length/2));
                return newCells;
            }
        }

        function drawJar() {
            const { x, y, width, height } = jarPos;
            ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + height - 10);
            ctx.quadraticCurveTo(x, y + height, x + 10, y + height); ctx.lineTo(x + width - 10, y + height);
            ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - 10); ctx.lineTo(x + width, y);
            ctx.closePath(); ctx.stroke(); ctx.fill();

            if (isStocking && cells.length > 0) {
                const fillPercent = 1 - (cells.length / MAX_CELLS);
                ctx.fillStyle = `hsla(333, 100%, 75%, ${0.3 + fillPercent * 0.5})`; 
                ctx.beginPath(); ctx.rect(x + 4, y + height - 4 - (height * fillPercent), width - 8, height * fillPercent);
                ctx.fill();
            }
        }

        function drawPointerRange() {
            if (!pointerRangeVisible) return;
            const range = cellBaseRadius() * clickRangeMultiplier();
            ctx.save();
            ctx.beginPath(); ctx.arc(pointerRangeX, pointerRangeY, range, 0, Math.PI * 2);
            ctx.setLineDash([7, 5]); ctx.lineDashOffset = 0;
            ctx.strokeStyle = 'rgba(230, 245, 255, .92)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }

        // --- 数式ロジック ---
        function calculateTotalTpFromJars(jars) { return jars < 1 ? 0 : Math.floor(Math.sqrt(jars)); }
        function getJarsRequiredForTp(tp) { return Math.pow(tp, 2); }

        function updateShopUI() {
            nutrientCost = Math.max(1, Math.ceil((nutrientLevel + 1) * (1 - getDiscount()))); cultureFluidCost = Math.max(1, Math.ceil((cultureFluidLevel + 1) * (1 - getDiscount())));
            nutrientLvlDisplay.innerText = nutrientLevel; nutrientCostDisplay.innerText = nutrientCost;
            cultureLvlDisplay.innerText = cultureFluidLevel; cultureCostDisplay.innerText = cultureFluidCost;
            buyNutrientBtn.disabled = (stockedJars < nutrientCost || isStocking);
            buyCultureBtn.disabled = (stockedJars < cultureFluidCost || isStocking);
        }

        function updatePrestigeUI() {
            totalJarsDisplay.innerText = totalJars; tpDisplay.innerText = prestigePoints;
            
            const totalEarnedTp = calculateTotalTpFromJars(totalJars);
            const pendingTp = pendingPrestigeTp();
            
            pendingTpDisplay.innerText = pendingTp;
            prestigeBtn.disabled = (pendingTp < 1 || isStocking);

            const nextTpNeedJars = getJarsRequiredForTp(totalEarnedTp + 1);
            nextTpJarsDisplay.innerText = Math.max(0, nextTpNeedJars - totalJars);

            // ノード詳細パネルが開いていれば更新
            if (selectedNodeId) {
                const node = skills[selectedNodeId];
                nodeNameDisp.innerText = node.name;
                nodeDescDisp.innerText = node.desc + ((node.requires||[]).length ? '\n前提: '+node.requires.map(id=>skills[id].name).join(' + ') : '');
                nodeLvlDisp.innerText = `${node.lvl} / ${node.max}`;
                nodeCostDisp.innerText = nextNodeCost(node);
                const unlocked = (node.requires || []).every(id => skills[id].lvl > 0);
                nodeUpgradeBtn.disabled = (!unlocked || prestigePoints < nextNodeCost(node) || node.lvl >= node.max);
                nodeUpgradeBtn.textContent = node.lvl >= node.max ? '購入済み' : !unlocked ? '前提スキルが必要' : `神経を強化 (コスト: ${nextNodeCost(node)} TP)`;
            }
        }

        function resetGame() {
            isStocking = false; cells = [];
            let earnedJars = 1 + (hasSkill('jar2') ? 3 : hasSkill('jar1') ? 1 : 0);
            if (Math.random() * 100 < skills.double.lvl * 25) earnedJars++;
            if (hasSkill('jar3')) earnedJars *= 2;
            stockedJars += earnedJars; totalJars += earnedJars;
            jarDisplay.innerText = stockedJars; countDisplay.innerText = 0;
            saveToLocalStorage(); updateShopUI(); updatePrestigeUI();
            const delay = hasSkill('packing') ? 80 : 1000;
            setTimeout(() => { if (!isStocking && cells.length === 0) { cells.push(new Cell(canvas.width / 2, canvas.height / 2, cellBaseRadius(), 333, 100, 75, 0, 0)); countDisplay.innerText = 1; } }, delay);
        }

        function triggerPrestige() {
            const totalEarnedTp = calculateTotalTpFromJars(totalJars);
            const pendingTp = pendingPrestigeTp();
            if (pendingTp < 1) return;

            prestigePoints += pendingTp; earnedTpLifetime += pendingTp; loopCount++;
            clearMutationEffects();
            const inherit = hasSkill('inherit3') ? 5 : hasSkill('inherit2') ? 3 : hasSkill('inherit1') ? 1 : 0;
            const starter = hasSkill('starter3') ? 5 : hasSkill('starter2') ? 3 : hasSkill('starter1') ? 1 : 0;
            const keptNutrient = Math.min(nutrientLevel, inherit);
            const keptCulture = Math.min(cultureFluidLevel, inherit);
            stockedJars = 0; nutrientLevel = Math.max(keptNutrient,starter); cultureFluidLevel = Math.max(keptCulture,starter); cells = [];
            
            updateCapacity();

            saveToLocalStorage(); updateShopUI(); updatePrestigeUI();
            cells.push(new Cell(canvas.width / 2, canvas.height / 2, cellBaseRadius(), 333, 100, 75, 0, 0));
            countDisplay.innerText = 1;
        }

        function saveToLocalStorage() {
            localStorage.setItem('cell_jars', stockedJars);
            localStorage.setItem('cell_total_jars', totalJars);
            localStorage.setItem('cell_tp', prestigePoints);
            localStorage.setItem('cell_tp_earned_v2', earnedTpLifetime);
            localStorage.setItem('cell_last_seen_v2', Date.now());
            localStorage.setItem('cell_loop', loopCount);




            localStorage.setItem('cell_nutrient_lvl', nutrientLevel);
            localStorage.setItem('cell_culture_lvl', cultureFluidLevel);
            Object.values(skills).forEach(node => localStorage.setItem('cell_sk_' + node.id, node.lvl));
        }

        // ★ 2: プレステージ画面（神経系グラフィック）の描画ロジック
        function drawPrestigeScreen() {
            pCtx.fillStyle = '#04040a'; pCtx.fillRect(0,0,pCanvas.width,pCanvas.height);
            pCtx.save();
            pCtx.translate(pCanvas.width/2 + treeCamera.x, pCanvas.height/2 + treeCamera.y);
            pCtx.scale(treeCamera.zoom,treeCamera.zoom);
            // グリッド
            pCtx.strokeStyle = '#111927'; pCtx.lineWidth = 1;
            for(let x=-1600;x<=1600;x+=165){pCtx.beginPath();pCtx.moveTo(x,-1100);pCtx.lineTo(x,1100);pCtx.stroke();}
            for(let y=-1100;y<=1100;y+=145){pCtx.beginPath();pCtx.moveTo(-1600,y);pCtx.lineTo(1600,y);pCtx.stroke();}
            Object.values(skills).forEach(node => (node.requires||[]).forEach(id => {
                const parent=skills[id]; if(!parent)return;
                pCtx.beginPath();pCtx.moveTo(parent.x,parent.y);pCtx.lineTo(node.x,node.y);
                pCtx.lineWidth=3;pCtx.strokeStyle=node.lvl>0?'#e040fb':((node.requires||[]).every(hasSkill)?'#32a5b7':'#344052');pCtx.stroke();
            }));
            Object.values(skills).forEach(node => {
                const unlocked=(node.requires||[]).every(hasSkill), owned=node.lvl>=node.max;
                const color=owned?'#d55cff':unlocked?'#00e5ff':'#526078';
                pCtx.beginPath();pCtx.arc(node.x,node.y,31,0,Math.PI*2);
                pCtx.fillStyle=owned?'#572166':unlocked?'#0d3844':'#131923';pCtx.fill();
                pCtx.lineWidth=selectedNodeId===node.id?5:2.5;
                pCtx.strokeStyle=selectedNodeId===node.id?'#fff':color;pCtx.stroke();
                pCtx.fillStyle='#fff';pCtx.font='bold 17px sans-serif';pCtx.textAlign='center';
                pCtx.fillText(node.lvl>=node.max?'✓':`Lv.${node.lvl}`,node.x,node.y+6);
                pCtx.fillStyle=owned?'#f4c7ff':unlocked?'#d4f8fb':'#7f8c9f';pCtx.font='bold 15px sans-serif';
                pCtx.fillText(node.name,node.x,node.y+57);
                pCtx.font='12px sans-serif';pCtx.fillText(owned?'購入完了':`${nextNodeCost(node)} TP`,node.x,node.y+75);
            });
            pCtx.restore();
            pCtx.fillStyle='#8caabb';pCtx.textAlign='right';pCtx.font='13px sans-serif';
            pCtx.fillText('ドラッグ: 移動 / ホイール: 拡大・縮小',pCanvas.width-20,pCanvas.height-22);
        }

        // メインループ
        function animate() {
            const timerNow = Date.now();
            if (timerNow - lastEffectTimerUpdate >= 100) {
                renderEffectTimers(timerNow);
                lastEffectTimerUpdate = timerNow;
            }
            if (currentScreen === 'main') {
                ctx.fillStyle = isStocking ? 'rgba(10, 10, 10, 0.3)' : 'rgba(17, 17, 17, 1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const now = performance.now();
                if (!isStocking && (cultureFluidLevel > 0 || hasSkill('auto4')) && now - lastAutoGrowTime >= (hasSkill('auto3') ? 600 : 1000)) {
                    let spawnCount = cultureFluidLevel > 0 ? cultureFluidLevel + (hasSkill('auto2') ? 4 : hasSkill('auto1') ? 1 : 0) : 0;
                    if (hasSkill('auto4')) spawnCount += 2;
                    if (hasSkill('mutation1') && Math.random() < (hasSkill('mutation2') ? .35 : .2)) spawnCount += hasSkill('mutation2') ? 3 : 1;
                    spawnCount = Math.min(Math.floor(spawnCount * (hasSkill('bonus2') ? 2 : hasSkill('bonus1') ? 1.5 : 1)), MAX_CELLS - cells.length);
                    if (skills.burst.lvl > 0 && Math.random() < 0.1) {
                        spawnCount = Math.min(spawnCount * 3, MAX_CELLS - cells.length);
                        ctx.fillStyle = 'rgba(0, 229, 255, 0.1)'; ctx.fillRect(0,0,canvas.width,canvas.height);
                    }
                    for (let i = 0; i < spawnCount; i++) {
                        let spawnX = canvas.width / 2; let spawnY = canvas.height / 2; let baseH = 333;
                        if (cells.length > 0) {
                            const randomCell = cells[Math.floor(Math.random() * cells.length)];
                            spawnX = randomCell.x + (Math.random() - 0.5) * 30; spawnY = randomCell.y + (Math.random() - 0.5) * 30; baseH = randomCell.h;
                        }
                        const nextH = (baseH + (Math.random() - 0.5) * 30) % 360;
                        const speed = 2; const angle = Math.random() * Math.PI * 2;
                        cells.push(new Cell(spawnX, spawnY, cellBaseRadius(), nextH, 100, 75, Math.cos(angle) * speed, Math.sin(angle) * speed));
                    }
                    lastAutoGrowTime = now; countDisplay.innerText = cells.length;
                } else if (isStocking) { lastAutoGrowTime = now; }

                if (!isStocking && cells.length >= MAX_CELLS) {
                    if (skills.packing.lvl > 0) { resetGame(); }
                    else { isStocking = true; updateShopUI(); }
                }
                drawJar();

                if (!isStocking) {
                    for (let i = 0; i < cells.length; i++) {
                        for (let j = i + 1; j < cells.length; j++) {
                            const dx = cells[j].x - cells[i].x; const dy = cells[j].y - cells[i].y;
                            const distance = Math.sqrt(dx * dx + dy * dy); const minDistance = cells[i].radius + cells[j].radius;
                            if (distance < minDistance) {
                                const angle = Math.atan2(dy, dx); const force = (minDistance - distance) * 0.08; 
                                cells[i].vx -= Math.cos(angle) * force; cells[i].vy -= Math.sin(angle) * force;
                                cells[j].vx += Math.cos(angle) * force; cells[j].vy += Math.sin(angle) * force;
                            }
                        }
                    }
                }
                cells.forEach(cell => { cell.update(); cell.draw(); });
                drawPointerRange();
                drawMutationParticles();
                if(performance.now()>mutationToastUntil)document.getElementById('mutation-toast').style.opacity='0';
                if (isStocking) {
                    cells = cells.filter(cell => !cell.markedForRemoval); countDisplay.innerText = cells.length; 
                    if (cells.length === 0 && isStocking) { resetGame(); }
                }
            } else {
                // プレステージ画面のアニメーション
                drawPrestigeScreen();
            }
            requestAnimationFrame(animate);
        }

        // --- ★ 1: 画面遷移イベントの設定 ---
        document.getElementById('go-prestige-btn').addEventListener('click', () => {
            currentScreen = 'prestige';
            mainScreen.style.display = 'none';
            prestigeScreen.style.display = 'block';
            prestigeScreen.classList.remove('tree-info-open');
            mobileTreeInfoToggle.setAttribute('aria-expanded', 'false');
            mobileTreeInfoToggle.textContent = '転生情報を開く';
            selectedNodeId = null;
            detailPanel.style.display = 'none';
            initNodePositions();
            updatePrestigeUI();
        });

        document.getElementById('back-to-main-btn').addEventListener('click', () => {
            currentScreen = 'main';
            mainScreen.style.display = 'block';
            prestigeScreen.style.display = 'none';
        });

        // パネルUIでのクリック貫通防止
        document.getElementById('main-ui').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('prestige-ui-top').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('node-detail-panel').addEventListener('mousedown', (e) => e.stopPropagation());

        // ショップ購入
        document.getElementById('buy-nutrient').addEventListener('click', () => {
            if (stockedJars >= nutrientCost && !isStocking) {
                stockedJars -= nutrientCost; nutrientLevel++; saveToLocalStorage(); jarDisplay.innerText = stockedJars; updateShopUI();
            }
        });
        document.getElementById('buy-culture').addEventListener('click', () => {
            if (stockedJars >= cultureFluidCost && !isStocking) {
                stockedJars -= cultureFluidCost; cultureFluidLevel++; saveToLocalStorage(); jarDisplay.innerText = stockedJars; updateShopUI();
            }
        });

        // 転生実行
        prestigeBtn.addEventListener('click', () => {
            if(confirm("遺伝子転生を行いますか？\n進捗はリセットされ、次の周回難易度が上がります。")) {
                triggerPrestige();
            }
        });

        // ノード強化実行
        nodeUpgradeBtn.addEventListener('click', () => {
            if (!selectedNodeId) return;
            const node = skills[selectedNodeId];
            if (prestigePoints >= node.cost && node.lvl < node.max && (node.requires || []).every(id => skills[id].lvl > 0)) {
                prestigePoints -= nextNodeCost(node);
                node.lvl++;
                updateCapacity();
                saveToLocalStorage();
                updatePrestigeUI();
            }
        });

        // 通常クリック（細胞分裂）
        function handleCellTap(e) {
            if (isStocking) return;
            const clickedCells = [...cells];
            const rangeMultiplier = clickRangeMultiplier();
            let changed = false;
            for (const cell of clickedCells) {
                const index = cells.indexOf(cell);
                if (index < 0) continue;
                const dist = Math.hypot(e.clientX - cell.x, e.clientY - cell.y);
                // 突然変異細胞は成長途中でも回収可能。回収した細胞は同じタップで分裂させない。
                if (cell.mutation && dist < cell.radius + 14) {
                    collectMutation(cell);
                    cell.mutation = null; cell.mutationVisual = null;
                    cell.color = getHslString(cell.h, cell.s, cell.l);
                    changed = true;
                    continue;
                }
                if (cell.isGrowing || dist >= cell.radius * rangeMultiplier || cells.length >= MAX_CELLS) continue;
                const newCells = cell.split().slice(0, MAX_CELLS - cells.length + 1);
                // クリックでできた子細胞のみ変異候補にする。自動生成は対象外。
                if (newCells.length) pickMutation(newCells[Math.floor(Math.random() * newCells.length)]);
                cells.splice(index, 1, ...newCells);
                changed = true;
            }
            if (changed) countDisplay.innerText = cells.length;
        }
        canvas.addEventListener('pointermove', e => {
            if (e.pointerType === 'touch') return;
            pointerRangeX = e.clientX; pointerRangeY = e.clientY; pointerRangeVisible = true;
        });
        canvas.addEventListener('pointerleave', () => { pointerRangeVisible = false; });
        canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            pointerRangeX = e.clientX; pointerRangeY = e.clientY; pointerRangeVisible = true;
            if (e.pointerType === 'touch') {
                clearTimeout(pointerRangeTimeout);
                pointerRangeTimeout = setTimeout(() => { pointerRangeVisible = false; }, 900);
            }
            handleCellTap(e);
        });

        mainScreen.classList.toggle('shop-open', !isMobileLayout());
        mobileShopToggle.addEventListener('click', () => {
            const isOpen = mainScreen.classList.toggle('shop-open');
            mobileShopToggle.setAttribute('aria-expanded', String(isOpen));
            mobileShopToggle.textContent = isOpen ? 'ショップを閉じる' : '情報・ショップを開く';
        });
        mobileTreeInfoToggle.addEventListener('click', () => {
            const isOpen = prestigeScreen.classList.toggle('tree-info-open');
            mobileTreeInfoToggle.setAttribute('aria-expanded', String(isOpen));
            mobileTreeInfoToggle.textContent = isOpen ? '転生情報を閉じる' : '転生情報を開く';
        });
        mobileLayout.addEventListener('change', () => {
            mainScreen.classList.remove('shop-open');
            prestigeScreen.classList.remove('tree-info-open');
            mobileShopToggle.setAttribute('aria-expanded', 'false');
            mobileShopToggle.textContent = 'ショップを開く';
            mobileTreeInfoToggle.setAttribute('aria-expanded', 'false');
            mobileTreeInfoToggle.textContent = '転生情報を開く';
        });

        // スキルツリーをドラッグ移動・ホイール/ピンチズーム・クリック選択
        let treeDrag = null;
        let treePinch = null;
        const activeTreePointers = new Map();
        pCanvas.addEventListener('pointerdown',e=>{
            e.preventDefault();
            pCanvas.setPointerCapture(e.pointerId);
            if (e.pointerType === 'touch') {
                activeTreePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
                if (activeTreePointers.size === 2) {
                    const points=[...activeTreePointers.values()];
                    treePinch={distance:Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y),zoom:treeCamera.zoom};
                    treeDrag=null;
                    return;
                }
            }
            treeDrag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:treeCamera.x,oy:treeCamera.y,moved:false};
        });
        pCanvas.addEventListener('pointermove',e=>{
            if (activeTreePointers.has(e.pointerId)) activeTreePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
            if (treePinch && activeTreePointers.size === 2) {
                const points=[...activeTreePointers.values()];
                const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
                treeCamera.zoom=Math.max(.3,Math.min(1.65,treePinch.zoom*distance/treePinch.distance));
                return;
            }
            if(!treeDrag || treeDrag.id!==e.pointerId)return;
            const dx=e.clientX-treeDrag.x,dy=e.clientY-treeDrag.y;
            if(Math.hypot(dx,dy)>6)treeDrag.moved=true;
            if(treeDrag.moved){treeCamera.x=treeDrag.ox+dx;treeCamera.y=treeDrag.oy+dy;}
        });
        const endTreePointer=e=>{
            const wasPinching=Boolean(treePinch);
            activeTreePointers.delete(e.pointerId);
            if (treePinch) treePinch=null;
            if(treeDrag && treeDrag.id===e.pointerId){
                if(!wasPinching && !treeDrag.moved){
                    const x=(e.clientX-pCanvas.width/2-treeCamera.x)/treeCamera.zoom;
                    const y=(e.clientY-pCanvas.height/2-treeCamera.y)/treeCamera.zoom;
                    const hit=Object.values(skills).find(n=>Math.hypot(x-n.x,y-n.y)<35);
                    selectedNodeId=hit?hit.id:null;
                    detailPanel.style.display=hit?'block':'none';updatePrestigeUI();
                }
                treeDrag=null;
            }
        };
        pCanvas.addEventListener('pointerup',endTreePointer);
        pCanvas.addEventListener('pointercancel',endTreePointer);
        pCanvas.addEventListener('wheel',e=>{
            e.preventDefault();
            const newZoom=Math.max(.3,Math.min(1.65,treeCamera.zoom*(e.deltaY>0?.9:1.1)));
            const px=e.clientX-pCanvas.width/2,py=e.clientY-pCanvas.height/2;
            treeCamera.x=px-(px-treeCamera.x)*newZoom/treeCamera.zoom;
            treeCamera.y=py-(py-treeCamera.y)*newZoom/treeCamera.zoom;
            treeCamera.zoom=newZoom;
        },{passive:false});
        function initGame() {
            if (localStorage.getItem('cell_jars')) stockedJars = parseInt(localStorage.getItem('cell_jars'));
            if (localStorage.getItem('cell_total_jars')) totalJars = parseInt(localStorage.getItem('cell_total_jars'));
            if (localStorage.getItem('cell_tp')) prestigePoints = parseInt(localStorage.getItem('cell_tp'));
            if (localStorage.getItem('cell_loop')) loopCount = parseInt(localStorage.getItem('cell_loop'));
            Object.values(skills).forEach(node => { node.lvl = Math.max(0,Math.min(node.max,parseInt(localStorage.getItem('cell_sk_'+node.id)||'0',10)||0)); });
            if (localStorage.getItem('cell_nutrient_lvl')) nutrientLevel = parseInt(localStorage.getItem('cell_nutrient_lvl'));
            if (localStorage.getItem('cell_culture_lvl')) cultureFluidLevel = parseInt(localStorage.getItem('cell_culture_lvl'));

            earnedTpLifetime = localStorage.getItem('cell_tp_earned_v2') !== null
                ? Math.max(0,Number(localStorage.getItem('cell_tp_earned_v2'))||0)
                : prestigePoints + totalSpentTp();
            // 既存セーブの旧TP計算と新規高レベル強化の差額は獲得済み扱いにする。
            if (localStorage.getItem('cell_tp_earned_v2') === null) {
                const oldSpent = skills.packing.lvl + skills.grow.lvl + skills.double.lvl*2 + skills.burst.lvl*3;
                earnedTpLifetime = prestigePoints + oldSpent;
            }
            const lastSeen=Number(localStorage.getItem('cell_last_seen_v2')||Date.now());
            const offlineMinutes=Math.floor(Math.max(0,Date.now()-lastSeen)/60000);
            const rate=hasSkill('offline3')?8:hasSkill('offline2')?3:hasSkill('offline1')?1:0;
            const cap=hasSkill('offline3')?480:hasSkill('offline2')?120:30;
            const offlineReward=Math.min(offlineMinutes,cap)*rate;
            if(offlineReward>0){stockedJars+=offlineReward;totalJars+=offlineReward;setTimeout(()=>alert(`休眠代謝: オフライン中に瓶を ${offlineReward} 個獲得！`),100);}
            updateCapacity();
            jarDisplay.innerText = stockedJars;

            initNodePositions();
            updateShopUI();
            updatePrestigeUI();

            cells = []; 
            cells.push(new Cell(canvas.width / 2, canvas.height / 2, cellBaseRadius(), 333, 100, 75, 0, 0));
            countDisplay.innerText = cells.length;
            saveToLocalStorage();
        }

        initGame();
        animate();
        document.addEventListener('visibilitychange',()=>{if(document.hidden)saveToLocalStorage();});
        window.addEventListener('pagehide',saveToLocalStorage);

        window.addEventListener('resize', () => {
            canvas.width = pCanvas.width = window.innerWidth;
            canvas.height = pCanvas.height = window.innerHeight;
            jarPos.x = canvas.width - 100; jarPos.y = canvas.height - 120;
            updateCapacity();
            const radius = cellBaseRadius();
            cells.forEach(cell => {
                cell.baseRadius = radius;
                cell.radius = Math.min(cell.radius, radius);
                cell.growthRate = (isMobileLayout() ? .65 : .5) * (1 + skills.grow.lvl * .3);
                cell.x = Math.min(Math.max(cell.x, radius), canvas.width - radius);
                cell.y = Math.min(Math.max(cell.y, radius), canvas.height - radius);
            });
            initNodePositions();
        });

