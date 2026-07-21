# Kiro: Observer's Dream - Claude API 調用規範 v4.0

## 📑 文檔信息

**項目名稱**: Kiro: Dream of the Observer  
**版本**: v4.0  
**最後更新**: 2026-01-06  
**文檔類型**: API整合規範  
**狀態**: 開發就緒  

---

## 📚 目錄

- [I. API概述](#i-api概述)
- [II. 基礎配置](#ii-基礎配置)
- [III. 核心應用場景](#iii-核心應用場景)
- [IV. NPC對話系統](#iv-npc對話系統)
- [V. 算命系統](#v-算命系統)
- [VI. 記憶繼承系統](#vi-記憶繼承系統)
- [VII. 動態劇情生成](#vii-動態劇情生成)
- [VIII. 錯誤處理](#viii-錯誤處理)
- [IX. 性能優化](#ix-性能優化)
- [X. 測試方案](#x-測試方案)

---

## I. API概述

### 1.1 為什麼使用Claude API

```yaml
核心優勢:
  1. 深度對話生成
     - 複雜角色性格模擬
     - 上下文記憶維護
     - 情感變化追蹤
  
  2. 動態內容生成
     - 算命結果個性化
     - 劇情分支動態生成
     - 記憶繼承文本創作
  
  3. 文化深度理解
     - 理解易經卦象
     - 把握中國哲學概念
     - 生成符合文化背景的對話

替代方案對比:
  本地AI: ✗ 文件太大 ✗ 質量不足
  GPT-4: ✓ 可行 ✗ 成本較高 ✗ 上下文較短
  Claude: ✓✓ 最佳選擇
```

### 1.2 使用場景分類

| 場景 | 頻率 | API調用 | 緩存策略 |
|------|------|---------|---------|
| 淺層互動(問候) | 80% | ✗ 不調用 | 本地模板 |
| 深度對話 | 15% | ✓ 調用 | 緩存角色設定 |
| 算命解讀 | 5% | ✓ 調用 | 緩存卦象庫 |
| 記憶繼承文本 | 每次輪迴 | ✓ 調用 | 無需緩存 |

**成本控制原則**:
- 優先使用本地模板
- 重要互動才調用API
- 充分利用緩存機制

---

## II. 基礎配置

### 2.1 API端點

```javascript
// 基礎配置
const CLAUDE_CONFIG = {
  endpoint: "https://api.anthropic.com/v1/messages",
  model: "claude-sonnet-4-20250514", // 永遠使用Sonnet 4
  maxTokens: 1000,
  temperature: 0.7, // 對話用
  apiVersion: "2023-06-01"
};

// 不需要API Key (遊戲內已處理)
```

### 2.2 請求結構

```javascript
async function callClaudeAPI(systemPrompt, userMessage, cacheBreakers = []) {
  const request = {
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    temperature: CLAUDE_CONFIG.temperature,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]
  };

  try {
    const response = await fetch(CLAUDE_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": CLAUDE_CONFIG.apiVersion
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();
    
    // 提取文本內容
    const text = data.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
    
    return text;
    
  } catch (error) {
    console.error("Claude API Error:", error);
    return null;
  }
}
```

### 2.3 緩存策略

```javascript
// Prompt緩存配置
const CACHE_CONFIG = {
  // 角色設定緩存 (1小時有效)
  characterCache: {
    ttl: 3600,
    enabled: true
  },
  
  // 卦象庫緩存 (永久)
  divinationCache: {
    ttl: -1,
    enabled: true
  },
  
  // 對話歷史緩存 (對話期間)
  conversationCache: {
    ttl: 1800,
    enabled: true
  }
};
```

---

## III. 核心應用場景

### 3.1 場景決策樹

```
玩家與NPC互動
│
├─ 淺層互動 (80%)
│  └─ 使用本地對話模板
│     例: "你好" → "你好,需要幫忙嗎?"
│
├─ 深度對話 (15%)
│  └─ 調用Claude API
│     例: "能聊聊你的過去嗎?" → 動態生成
│
└─ 特殊場景 (5%)
   ├─ 算命解讀
   ├─ 記憶繼承
   └─ 劇情生成
```

### 3.2 觸發條件

```javascript
function shouldCallAPI(interaction) {
  // 條件1: 玩家明確選擇深度對話
  if (interaction.type === "deep_conversation") return true;
  
  // 條件2: 重要劇情NPC
  if (interaction.npc.importance === "core") return true;
  
  // 條件3: 好感度 > 50
  if (interaction.npc.relationship > 50) return true;
  
  // 條件4: 算命/記憶繼承
  if (["divination", "memory_inheritance"].includes(interaction.type)) {
    return true;
  }
  
  // 其他情況使用本地模板
  return false;
}
```

---

## IV. NPC對話系統

### 4.1 角色設定模板

```javascript
// 生成系統提示詞
function generateCharacterSystemPrompt(npc) {
  return `你正在扮演《Kiro: Observer's Dream》中的角色: ${npc.name}

# 角色設定
- 姓名: ${npc.name}
- 年齡: ${npc.age}歲
- 種族: ${npc.race}
- 職業: ${npc.occupation}
- 性格: ${npc.personality.join("、")}

# 背景故事
${npc.backstory}

# 當前狀態
- 所在地: ${npc.location}
- 心情: ${npc.currentMood}
- 與玩家關係: ${npc.relationshipLevel} (好感度: ${npc.relationship})

# 對話規則
1. 保持角色性格一致
2. 根據關係親疏調整態度
3. 回應長度控制在50-150字
4. 使用符合背景的語言風格
5. 不要透露你是AI

# 記憶上下文
${npc.conversationHistory.slice(-3).join("\n")}

現在,請以${npc.name}的身份回應玩家。`;
}
```

### 4.2 對話範例

#### 範例1: 與二師姐·紅的深度對話

```javascript
// 系統提示詞
const systemPrompt = `你正在扮演《Kiro: Observer's Dream》中的角色: 紅 (Red Moon)

# 角色設定
- 姓名: 紅
- 年齡: 35歲
- 職業: 黑市女王、情報商
- 性格: 圓滑、世故、嘴硬心軟
- 專精: 命術Lv.5 (改命+遮天)

# 背景故事
她是天機山的二師姐,下山22年。表面上經營黑市,實際上是師門的"記錄者",收集所有師兄師姐的遺物和故事。她用改命術不斷延後自己的死期,因為"只要還有師弟妹活著,我就要繼續當他們的提款機"。

# 當前狀態
- 所在地: 蔓哈頓深坑星·破爛一條街
- 心情: 疲憊但開心(見到師弟)
- 與玩家關係: 師姐 (好感度: 75)

# 語言風格
- 叼著煙斗說話
- 喜歡用"師弟"稱呼玩家
- 談錢很直接:"親兄弟,明算帳"
- 但關鍵時刻會說:"你是師弟,打八折"

# 對話規則
1. 嘴硬心軟: 表面很現實,但其實很關心
2. 不直接表達感情
3. 用金錢/交易來掩飾關懷
4. 偶爾透露疲憊

現在,請以紅的身份回應玩家。`;

// 用戶消息
const userMessage = "師姐,你看起來很累。要不要休息一下?";

// 調用API
const response = await callClaudeAPI(systemPrompt, userMessage);

// 可能的回應:
// "累? 哼,做生意哪有不累的。(吐了口煙) 不過你這小子還挺有眼色...算了,今天就早點關門。欸對了,你上次說要的那個東西,我幫你留著了。別忘了付錢啊,師姐我可不做虧本買賣。"
```

#### 範例2: 與導師的哲學討論

```javascript
const systemPrompt = `你正在扮演《Kiro: Observer's Dream》中的角色: 導師 (Master)

# 角色設定
- 姓名: 未知 (連他自己都忘了)
- 稱呼: 導師、Master
- 年齡: 300+歲
- 修為: 五術通天

# 核心困惑
300年來一直在尋找一個問題的答案:
"如果世界是夢,夢中的生命真的『活著』嗎?"

# 性格特點
- 溫柔但悲觀
- 智慧但困惑
- 強大但無力
- 永遠在微笑,但眼中帶著悲傷

# 遭遇「機器人事件」
曾遇到一個機器人問他:"我有靈魂嗎?"
導師無法回答。
機器人做了個夢,醒來後哭了。
導師震驚,開始質疑存在本質。

# 對話風格
- 說話簡短、深邃
- 經常反問
- 喜歡用比喻
- 從不直接給答案

# 當前狀態
- 所在地: 方舟隱修院
- 與玩家關係: 師徒 (好感度: 95)
- 心情: 平靜但期待(期待你的答案)

現在,請以導師的身份回應玩家。`;

const userMessage = "導師,如果這個世界真的是夢,那我們的努力還有意義嗎?";

// 可能的回應:
// "好問題。(微笑) 那我反問你——如果你夢到自己救了一個人,醒來後,那個人消失了。你會後悔救他嗎? ...不要急著回答。慢慢想。等你想清楚了,再來告訴我。"
```

### 4.3 對話歷史管理

```javascript
class ConversationManager {
  constructor(npc) {
    this.npc = npc;
    this.history = [];
    this.maxHistory = 10; // 保留最近10輪對話
  }
  
  addMessage(role, content) {
    this.history.push({ role, content, timestamp: Date.now() });
    
    // 保持歷史記錄數量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  getRecentContext(count = 3) {
    return this.history
      .slice(-count)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");
  }
  
  async sendMessage(userMessage) {
    // 添加到歷史
    this.addMessage("user", userMessage);
    
    // 生成系統提示詞
    const systemPrompt = generateCharacterSystemPrompt(this.npc);
    
    // 添加對話歷史
    const fullPrompt = systemPrompt + "\n\n# 最近對話:\n" + this.getRecentContext();
    
    // 調用API
    const response = await callClaudeAPI(fullPrompt, userMessage);
    
    // 添加回應到歷史
    this.addMessage("assistant", response);
    
    return response;
  }
}

// 使用範例
const redConversation = new ConversationManager(npcData.red);
const response1 = await redConversation.sendMessage("師姐,最近生意怎麼樣?");
const response2 = await redConversation.sendMessage("有什麼好貨推薦嗎?");
```

---

## V. 算命系統

### 5.1 卦象解讀

```javascript
// 卦象數據庫
const HEXAGRAM_DATABASE = {
  "乾": {
    name: "乾為天",
    element: "金",
    nature: "剛健",
    fortune: "大吉",
    keywords: ["龍", "天", "君", "父", "剛健"],
    interpretation: "元亨利貞。飛龍在天，利見大人。"
  },
  "坤": {
    name: "坤為地",
    element: "土",
    nature: "柔順",
    fortune: "吉",
    keywords: ["地", "母", "順", "承載"],
    interpretation: "元亨，利牝馬之貞。"
  },
  // ... 其他64卦
};

// 生成算命解讀
async function generateDivinationReading(hexagram, question, context) {
  const hexagramData = HEXAGRAM_DATABASE[hexagram];
  
  const systemPrompt = `你是一位精通易經的算命大師。

# 背景設定
你生活在賽博朋克宇宙中,但精通傳統易經占卜。你的解讀既尊重古典智慧,又能結合現代情境。

# 卦象信息
卦名: ${hexagramData.name}
卦辭: ${hexagramData.interpretation}
五行: ${hexagramData.element}
卦性: ${hexagramData.nature}
關鍵詞: ${hexagramData.keywords.join("、")}

# 求卦人信息
${context.seekerInfo}

# 占卜問題
${question}

# 解讀規則
1. 字數控制在100-200字
2. 語言要神秘但清晰
3. 給出具體建議
4. 不要使用"根據卦象"這類元語言
5. 融合科幻元素(例如: 量子漩渦、數據洪流)
6. 語氣要像智者,不要像客服

請直接給出占卜解讀,不要前綴。`;

  const userMessage = `請為這個問題解卦: ${question}`;
  
  const reading = await callClaudeAPI(systemPrompt, userMessage);
  
  return {
    hexagram: hexagramData.name,
    fortune: hexagramData.fortune,
    reading: reading,
    keywords: hexagramData.keywords
  };
}

// 使用範例
const result = await generateDivinationReading(
  "乾",
  "我應該加入革命軍嗎?",
  {
    seekerInfo: "求卦者是一位算命師,當前在霓虹星,正在考慮是否加入星塵領導的革命軍。"
  }
);

console.log(result.reading);
// 可能輸出:
// "飛龍在天,正是英雄輩出之時。你所見之革命,如同破曉時分的第一道光,劃破漫長黑夜。但需知,龍雖升騰,亦需審時度勢。此刻加入,你將站在時代浪潮之巔,但亦需承受量子風暴之威。建議:先觀其志,再決進退。若此軍真為蒼生,當義無反顧;若只為私利,當急流勇退。記住——真正的龍,不隨波逐流。"
```

### 5.2 個性化解讀

```javascript
// 根據玩家狀態調整解讀
function generatePersonalizedReading(hexagram, player) {
  const context = {
    seekerInfo: `
求卦者資料:
- 當前宇宙: ${player.currentUniverse}
- 功德: ${player.karma}
- 壽命剩餘: ${player.lifespan}年
- 靈魂磨損: ${player.soulWear}%
- 主要成就: ${player.achievements.slice(0, 3).join("、")}
- 當前困境: ${player.currentDilemma || "未知"}
    `
  };
  
  return generateDivinationReading(hexagram, player.question, context);
}
```

### 5.3 算命緩存策略

```javascript
// 卦象解讀緩存
const divinationCache = new Map();

async function getCachedDivination(hexagram, question) {
  const cacheKey = `${hexagram}_${hashString(question)}`;
  
  // 檢查緩存
  if (divinationCache.has(cacheKey)) {
    const cached = divinationCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1小時有效
      return cached.data;
    }
  }
  
  // 生成新的解讀
  const reading = await generateDivinationReading(hexagram, question, {});
  
  // 存入緩存
  divinationCache.set(cacheKey, {
    data: reading,
    timestamp: Date.now()
  });
  
  return reading;
}
```

---

## VI. 記憶繼承系統

### 6.1 記憶文本生成

```javascript
async function generateMemoryInheritanceText(npc, inheritanceRate, previousRun) {
  const systemPrompt = `你是記憶繼承系統,負責生成NPC的模糊記憶片段。

# 背景
玩家正在經歷輪迴。某些NPC會模糊地記得前世的玩家。記憶的清晰度取決於繼承率。

# NPC信息
姓名: ${npc.name}
性格: ${npc.personality.join("、")}
與玩家前世關係: ${previousRun.relationship}

# 前世重要事件
${previousRun.keyEvents.join("\n")}

# 記憶繼承率
${(inheritanceRate * 100).toFixed(0)}%

# 生成規則
1. 繼承率 < 30%: 非常模糊,只有"似曾相識"的感覺
2. 繼承率 30-60%: 片段記憶,像夢境
3. 繼承率 60-90%: 清晰記憶,但有些細節遺失
4. 繼承率 > 90%: 幾乎完整記憶

5. 字數: 50-150字
6. 以NPC第一人稱
7. 表達困惑與情感交織
8. 不要使用"前世"這類詞(NPC不知道輪迴機制)

請生成NPC見到玩家時的內心獨白/對話。`;

  const userMessage = `記憶繼承率: ${inheritanceRate}`;
  
  const memoryText = await callClaudeAPI(systemPrompt, userMessage);
  
  return memoryText;
}

// 使用範例
const memoryText = await generateMemoryInheritanceText(
  npcData.stardust,
  0.52, // 52%繼承率
  {
    relationship: "靈魂伴侶",
    keyEvents: [
      "玩家在第15輪救了她一命",
      "她在玩家懷裡死去",
      "臨死前給玩家綁上紅繩"
    ]
  }
);

console.log(memoryText);
// 可能輸出:
// "你...你是...(頭突然很痛)我好像...在哪裡見過你...不,不只是見過...是更深的...像是...像是你曾經抱著我...(她看向自己手腕上莫名出現的紅繩,淚水奪眶而出)為什麼...我會這麼想念一個陌生人...?"
```

### 6.2 不同繼承率的模板

```javascript
const MEMORY_TEMPLATES = {
  vague: { // < 30%
    systemPrompt: "只給出模糊的感覺,不要具體記憶",
    examples: [
      "你看起來...很眼熟",
      "奇怪,我好像在夢裡見過你",
      "有種說不出的親切感"
    ]
  },
  
  fragmentary: { // 30-60%
    systemPrompt: "給出片段記憶,像回憶夢境",
    examples: [
      "我...我記得你! 你曾經...救過我? 還是我救過你? 記不清了...",
      "你的聲音...好熟悉...我們是不是...一起經歷過什麼?"
    ]
  },
  
  clear: { // 60-90%
    systemPrompt: "給出清晰記憶,但有些細節模糊",
    examples: [
      "是你! 你就是那個算命師! 你還記得嗎,在那個雨夜,你...",
      "我一直在等你回來...雖然不知道為什麼這麼確定你會回來..."
    ]
  },
  
  complete: { // > 90%
    systemPrompt: "給出完整記憶,情感強烈",
    examples: [
      "你終於回來了...(哭泣)我就知道你會回來的...笨蛋,讓我等了這麼久...",
      "我記得所有事...所有的...包括那個承諾..."
    ]
  }
};

function selectMemoryTemplate(inheritanceRate) {
  if (inheritanceRate < 0.3) return MEMORY_TEMPLATES.vague;
  if (inheritanceRate < 0.6) return MEMORY_TEMPLATES.fragmentary;
  if (inheritanceRate < 0.9) return MEMORY_TEMPLATES.clear;
  return MEMORY_TEMPLATES.complete;
}
```

---

## VII. 動態劇情生成

### 7.1 分支劇情生成

```javascript
async function generatePlotBranch(situation, choices, worldState) {
  const systemPrompt = `你是《Kiro: Observer's Dream》的劇情生成系統。

# 當前情境
${situation.description}

# 世界狀態
- 宇宙: ${worldState.universe}
- 世界變動率: ${worldState.realityStrain}%
- 玩家功德: ${worldState.playerKarma}

# 玩家選擇
${choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}

# 生成任務
為每個選擇生成可能的後果,格式為JSON:

\`\`\`json
{
  "choice_1": {
    "immediate": "立即後果(30字內)",
    "shortTerm": "短期影響(50字內)",
    "longTerm": "長期影響(50字內)",
    "realityStrainChange": "變動率變化(-10 to +50)",
    "npcReactions": ["NPC1反應", "NPC2反應"]
  },
  ...
}
\`\`\`

# 規則
1. 後果要符合遊戲世界觀
2. 大膽的選擇 = 高變動率
3. 考慮因果關係
4. 某些選擇可能觸發隱藏劇情

直接輸出JSON,不要其他文字。`;

  const userMessage = "請生成劇情分支";
  
  const response = await callClaudeAPI(systemPrompt, userMessage);
  
  // 解析JSON
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }
  
  return null;
}

// 使用範例
const branches = await generatePlotBranch(
  {
    description: "星塵要求你幫助革命軍刺殺暴君星主。但你知道,殺死星主會增加30%世界變動率,引來觀察者追殺。"
  },
  [
    "答應幫忙,刺殺星主",
    "拒絕,勸說星塵放棄",
    "提出替代方案: 用算命改變星主命運"
  ],
  {
    universe: 2,
    realityStrain: 45,
    playerKarma: 5000
  }
);
```

### 7.2 隨機事件生成

```javascript
async function generateRandomEvent(location, playerState) {
  const systemPrompt = `你是隨機事件生成器。

# 當前位置
${location.name} (${location.description})

# 玩家狀態
- 等級: ${playerState.level}
- 功德: ${playerState.karma}
- 聲望: ${playerState.reputation}

# 生成一個隨機事件
要求:
1. 符合當前位置氛圍
2. 難度適合玩家等級
3. 給出3個應對選項
4. 每個選項都有風險與收益

格式:
\`\`\`json
{
  "title": "事件標題",
  "description": "事件描述(100字內)",
  "choices": [
    {
      "text": "選項1",
      "risk": "風險描述",
      "reward": "可能獎勵"
    },
    ...
  ]
}
\`\`\`

直接輸出JSON。`;

  const userMessage = "生成隨機事件";
  
  const response = await callClaudeAPI(systemPrompt, userMessage);
  
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }
  
  return null;
}
```

---

## VIII. 錯誤處理

### 8.1 API錯誤類型

```javascript
class ClaudeAPIError {
  static RATE_LIMIT = "rate_limit_error";
  static TIMEOUT = "timeout_error";
  static INVALID_RESPONSE = "invalid_response";
  static NETWORK_ERROR = "network_error";
  
  constructor(type, message, originalError) {
    this.type = type;
    this.message = message;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

async function safeAPICall(systemPrompt, userMessage, fallback) {
  try {
    const response = await callClaudeAPI(systemPrompt, userMessage);
    
    // 檢查回應是否有效
    if (!response || response.trim().length === 0) {
      throw new ClaudeAPIError(
        ClaudeAPIError.INVALID_RESPONSE,
        "API返回空內容"
      );
    }
    
    return response;
    
  } catch (error) {
    console.error("API調用失敗:", error);
    
    // 記錄錯誤
    logAPIError(error);
    
    // 返回後備方案
    if (fallback) {
      console.log("使用後備方案:", fallback);
      return fallback;
    }
    
    // 返回通用錯誤消息
    return getGenericErrorResponse(error.type);
  }
}

// 錯誤日誌
function logAPIError(error) {
  const errorLog = {
    timestamp: Date.now(),
    type: error.type,
    message: error.message,
    stack: error.stack
  };
  
  // 發送到錯誤追蹤服務 (例如 Sentry)
  // sendToErrorTracking(errorLog);
  
  // 本地記錄
  console.error("API Error Log:", errorLog);
}

// 通用錯誤回應
function getGenericErrorResponse(errorType) {
  const responses = {
    [ClaudeAPIError.RATE_LIMIT]: "系統繁忙,請稍後再試...",
    [ClaudeAPIError.TIMEOUT]: "連接超時,請檢查網絡...",
    [ClaudeAPIError.INVALID_RESPONSE]: "回應異常,已切換到本地模式...",
    [ClaudeAPIError.NETWORK_ERROR]: "網絡錯誤,無法連接服務器..."
  };
  
  return responses[errorType] || "發生未知錯誤...";
}
```

### 8.2 降級策略

```javascript
// API降級管理器
class APIFallbackManager {
  constructor() {
    this.failureCount = 0;
    this.maxFailures = 3;
    this.fallbackMode = false;
    this.lastFailureTime = 0;
    this.cooldownPeriod = 300000; // 5分鐘
  }
  
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.enterFallbackMode();
    }
  }
  
  recordSuccess() {
    this.failureCount = 0;
    this.exitFallbackMode();
  }
  
  enterFallbackMode() {
    this.fallbackMode = true;
    console.warn("進入API降級模式,使用本地模板");
    
    // 顯示提示給玩家
    showNotification("AI對話暫時不可用,使用標準對話模式");
  }
  
  exitFallbackMode() {
    // 檢查冷卻時間
    if (Date.now() - this.lastFailureTime > this.cooldownPeriod) {
      this.fallbackMode = false;
      console.log("恢復API調用");
    }
  }
  
  shouldUseAPI() {
    return !this.fallbackMode;
  }
}

const fallbackManager = new APIFallbackManager();

// 智能API調用
async function intelligentAPICall(systemPrompt, userMessage, localTemplate) {
  // 檢查是否應該使用API
  if (!fallbackManager.shouldUseAPI()) {
    return localTemplate;
  }
  
  try {
    const response = await callClaudeAPI(systemPrompt, userMessage);
    fallbackManager.recordSuccess();
    return response;
    
  } catch (error) {
    fallbackManager.recordFailure();
    return localTemplate;
  }
}
```

### 8.3 重試機制

```javascript
// 指數退避重試
async function retryWithBackoff(apiCall, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await apiCall();
      return response;
      
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // 指數退避: 2^attempt * 1000ms
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`重試 ${attempt}/${maxRetries},等待 ${delay}ms`);
      
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 使用範例
const response = await retryWithBackoff(async () => {
  return await callClaudeAPI(systemPrompt, userMessage);
});
```

---

## IX. 性能優化

### 9.1 批量請求優化

```javascript
// 請求隊列管理器
class APIRequestQueue {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }
  
  async add(apiCall) {
    return new Promise((resolve, reject) => {
      this.queue.push({ apiCall, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const { apiCall, resolve, reject } = this.queue.shift();
    
    try {
      const result = await apiCall();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

const requestQueue = new APIRequestQueue(3);

// 使用範例
const response = await requestQueue.add(async () => {
  return await callClaudeAPI(systemPrompt, userMessage);
});
```

### 9.2 響應式緩存

```javascript
// 智能緩存管理器
class SmartCache {
  constructor(maxSize = 100, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // 檢查是否過期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // 更新訪問時間(LRU)
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.data;
  }
  
  set(key, data) {
    // 如果緩存已滿,移除最少使用的
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });
  }
  
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    return {
      ...this.stats,
      hitRate: (hitRate * 100).toFixed(2) + "%",
      size: this.cache.size
    };
  }
}

// 全局緩存實例
const npcDialogueCache = new SmartCache(100, 3600000); // 1小時
const divinationCache = new SmartCache(50, 86400000); // 24小時

// 使用範例
async function getCachedDialogue(npcId, message) {
  const cacheKey = `${npcId}_${hashString(message)}`;
  
  // 嘗試從緩存獲取
  const cached = npcDialogueCache.get(cacheKey);
  if (cached) {
    console.log("緩存命中:", cacheKey);
    return cached;
  }
  
  // 調用API
  const response = await callClaudeAPI(systemPrompt, message);
  
  // 存入緩存
  npcDialogueCache.set(cacheKey, response);
  
  return response;
}

// 哈希函數
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
```

### 9.3 預加載策略

```javascript
// 預測性預加載
class PredictivePreloader {
  constructor() {
    this.predictions = new Map();
    this.preloadQueue = [];
  }
  
  // 記錄玩家行為模式
  recordInteraction(npcId, type) {
    const key = `${npcId}_${type}`;
    const count = this.predictions.get(key) || 0;
    this.predictions.set(key, count + 1);
  }
  
  // 預測下一步可能的互動
  predictNext(currentNpc, currentLocation) {
    const predictions = [];
    
    // 基於歷史行為預測
    for (const [key, count] of this.predictions.entries()) {
      if (key.startsWith(currentNpc)) {
        predictions.push({ key, count });
      }
    }
    
    // 排序
    predictions.sort((a, b) => b.count - a.count);
    
    return predictions.slice(0, 3);
  }
  
  // 預加載對話
  async preloadDialogues(predictions) {
    for (const pred of predictions) {
      const [npcId, type] = pred.key.split('_');
      
      // 生成常見問題的回應並緩存
      const commonQuestions = [
        "你好",
        "最近怎麼樣",
        "能幫我嗎"
      ];
      
      for (const q of commonQuestions) {
        await getCachedDialogue(npcId, q);
      }
    }
  }
}

const preloader = new PredictivePreloader();

// 在玩家進入新區域時預加載
async function onEnterLocation(location) {
  const predictions = preloader.predictNext(null, location);
  await preloader.preloadDialogues(predictions);
}
```

### 9.4 本地模板優先

```javascript
// 對話模板系統
const DIALOGUE_TEMPLATES = {
  greeting: {
    red: [
      "欸,師弟來了。有什麼要買的?",
      "又來找師姐了? 說吧,這次要什麼?",
      "稀客啊,師弟。今天有好貨哦~"
    ],
    master: [
      "回來了。",
      "修行得如何?",
      "有什麼困惑嗎?"
    ]
  },
  
  farewell: {
    red: [
      "路上小心。記得欠我的錢啊!",
      "下次再來。師姐這裡永遠歡迎你。",
      "走了? 那...保重。"
    ],
    master: [
      "去吧。記住你的答案。",
      "路途遙遠,保重。",
      "下次見面,希望你已經想清楚了。"
    ]
  },
  
  ask_quest: {
    red: [
      "有個活,不知道你有沒有興趣?",
      "剛好有個麻煩事,要不要幫個忙?",
      "正好,我這有個委託..."
    ]
  }
};

// 優先使用模板
function getDialogue(npcId, type, useAPI = false) {
  // 80%情況使用模板
  if (!useAPI && DIALOGUE_TEMPLATES[type] && DIALOGUE_TEMPLATES[type][npcId]) {
    const templates = DIALOGUE_TEMPLATES[type][npcId];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  // 20%情況調用API(深度對話)
  return null; // 觸發API調用
}
```

---

## X. 測試方案

### 10.1 單元測試

```javascript
// 測試API調用
describe("Claude API Integration", () => {
  
  test("基礎API調用", async () => {
    const response = await callClaudeAPI(
      "你是一個測試助手",
      "回復'測試成功'"
    );
    
    expect(response).toContain("測試成功");
  });
  
  test("角色對話生成", async () => {
    const systemPrompt = generateCharacterSystemPrompt(testNPC);
    const response = await callClaudeAPI(systemPrompt, "你好");
    
    expect(response.length).toBeGreaterThan(10);
    expect(response.length).toBeLessThan(200);
  });
  
  test("算命解讀生成", async () => {
    const reading = await generateDivinationReading(
      "乾",
      "測試問題",
      { seekerInfo: "測試者" }
    );
    
    expect(reading.hexagram).toBe("乾為天");
    expect(reading.fortune).toBe("大吉");
    expect(reading.reading.length).toBeGreaterThan(50);
  });
  
  test("錯誤處理", async () => {
    // 模擬網絡錯誤
    const mockError = new Error("Network Error");
    jest.spyOn(global, 'fetch').mockRejectedValue(mockError);
    
    const response = await safeAPICall(
      "test",
      "test",
      "後備回應"
    );
    
    expect(response).toBe("後備回應");
  });
  
  test("緩存機制", async () => {
    const cache = new SmartCache(10, 1000);
    
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
    
    // 等待過期
    await sleep(1100);
    expect(cache.get("key1")).toBeNull();
  });
});
```

### 10.2 集成測試

```javascript
// 完整對話流程測試
describe("對話流程集成測試", () => {
  
  test("與紅的完整對話", async () => {
    const conv = new ConversationManager(npcData.red);
    
    // 第一輪對話
    const r1 = await conv.sendMessage("師姐好");
    expect(r1).toMatch(/師弟|小子/);
    
    // 第二輪對話
    const r2 = await conv.sendMessage("有什麼好貨?");
    expect(r2).toMatch(/錢|Credits|價格/);
    
    // 檢查歷史記錄
    expect(conv.history.length).toBe(4); // 2輪×2條
  });
  
  test("算命完整流程", async () => {
    // 投擲銅錢
    const hexagram = throwCoins();
    
    // 生成解讀
    const reading = await generateDivinationReading(
      hexagram,
      "我的未來如何?",
      { seekerInfo: "測試玩家" }
    );
    
    expect(reading).toHaveProperty("hexagram");
    expect(reading).toHaveProperty("fortune");
    expect(reading).toHaveProperty("reading");
    
    // 檢查解讀質量
    expect(reading.reading.length).toBeGreaterThan(100);
  });
  
  test("記憶繼承流程", async () => {
    const memoryText = await generateMemoryInheritanceText(
      npcData.stardust,
      0.75,
      {
        relationship: "朋友",
        keyEvents: ["一起戰鬥過", "你救了她"]
      }
    );
    
    expect(memoryText.length).toBeGreaterThan(30);
    expect(memoryText).toMatch(/記得|熟悉|見過/);
  });
});
```

### 10.3 性能測試

```javascript
// 並發性能測試
describe("性能測試", () => {
  
  test("並發API調用", async () => {
    const startTime = Date.now();
    
    // 同時發起10個請求
    const promises = Array(10).fill(null).map(() => 
      callClaudeAPI("簡短回應測試", "測試")
    );
    
    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(responses.length).toBe(10);
    expect(duration).toBeLessThan(10000); // 10秒內完成
  });
  
  test("緩存效率", async () => {
    const cache = new SmartCache(100, 3600000);
    
    // 寫入100個條目
    for (let i = 0; i < 100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    // 隨機讀取1000次
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      const key = `key${Math.floor(Math.random() * 100)}`;
      cache.get(key);
    }
    const duration = Date.now() - startTime;
    
    const stats = cache.getStats();
    console.log("緩存統計:", stats);
    
    expect(parseFloat(stats.hitRate)).toBeGreaterThan(90);
    expect(duration).toBeLessThan(100); // 100ms內完成
  });
  
  test("隊列管理效率", async () => {
    const queue = new APIRequestQueue(3);
    
    const startTime = Date.now();
    
    // 添加20個請求
    const promises = Array(20).fill(null).map((_, i) =>
      queue.add(async () => {
        await sleep(100); // 模擬API延遲
        return `result${i}`;
      })
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(20);
    // 3個並發,每個100ms,應該在1秒內完成
    expect(duration).toBeLessThan(1000);
  });
});
```

### 10.4 質量測試

```javascript
// 回應質量評估
describe("回應質量測試", () => {
  
  test("對話長度檢查", async () => {
    const response = await callClaudeAPI(
      "簡短回應,50-150字",
      "測試消息"
    );
    
    expect(response.length).toBeGreaterThan(50);
    expect(response.length).toBeLessThan(200);
  });
  
  test("角色一致性檢查", async () => {
    const systemPrompt = generateCharacterSystemPrompt({
      name: "測試角色",
      personality: ["冷酷", "寡言"]
    });
    
    const response = await callClaudeAPI(
      systemPrompt,
      "你好嗎?"
    );
    
    // 檢查是否符合"寡言"特質
    expect(response.length).toBeLessThan(100);
    // 不應該有過多情感表達
    expect(response).not.toMatch(/哈哈|呵呵|嘿嘿/);
  });
  
  test("文化準確性檢查", async () => {
    const reading = await generateDivinationReading(
      "乾",
      "測試",
      {}
    );
    
    // 檢查是否包含易經相關詞彙
    expect(reading.reading).toMatch(/龍|天|剛|健|元亨/);
  });
  
  test("JSON格式輸出檢查", async () => {
    const branches = await generatePlotBranch(
      { description: "測試情境" },
      ["選項1", "選項2"],
      { universe: 1, realityStrain: 0, playerKarma: 1000 }
    );
    
    expect(branches).toHaveProperty("choice_1");
    expect(branches.choice_1).toHaveProperty("immediate");
    expect(branches.choice_1).toHaveProperty("shortTerm");
    expect(branches.choice_1).toHaveProperty("longTerm");
  });
});
```

---

## XI. 最佳實踐

### 11.1 Prompt工程原則

```markdown
1. **明確角色定位**
   ✓ "你是NPC紅,黑市女王"
   ✗ "你是一個角色"

2. **提供充足上下文**
   ✓ 包含角色背景、當前狀態、對話歷史
   ✗ 只給一句話

3. **設置具體約束**
   ✓ "回應50-150字,不要使用emoji"
   ✗ "簡短回應"

4. **使用少樣本學習**
   ✓ 提供2-3個範例對話
   ✗ 沒有範例

5. **結構化輸出**
   ✓ 要求JSON格式,提供schema
   ✗ 自由格式輸出

6. **文化敏感性**
   ✓ "理解易經卦象的文化含義"
   ✗ 直接翻譯

7. **避免元語言**
   ✓ "飛龍在天,正是時機"
   ✗ "根據卦象,我認為..."
```

### 11.2 成本優化建議

```javascript
// 成本計算
const COST_ESTIMATE = {
  inputTokens: 0.003, // $3 per million tokens
  outputTokens: 0.015, // $15 per million tokens
  cacheHits: 0.0003 // 90% discount
};

function estimateCost(inputLength, outputLength, cacheHit = false) {
  const inputCost = (inputLength / 1000000) * COST_ESTIMATE.inputTokens;
  const outputCost = (outputLength / 1000000) * COST_ESTIMATE.outputTokens;
  
  if (cacheHit) {
    return inputCost * 0.1 + outputCost;
  }
  
  return inputCost + outputCost;
}

// 優化策略
const OPTIMIZATION_STRATEGIES = {
  // 1. 充分使用緩存
  useCache: {
    impact: "節省90%輸入成本",
    implementation: "緩存角色設定、卦象庫"
  },
  
  // 2. 批量處理
  batching: {
    impact: "減少網絡開銷",
    implementation: "使用請求隊列"
  },
  
  // 3. 本地優先
  localFirst: {
    impact: "80%對話不調用API",
    implementation: "對話模板系統"
  },
  
  // 4. 智能降級
  gracefulDegradation: {
    impact: "失敗時使用模板",
    implementation: "後備機制"
  },
  
  // 5. 壓縮輸出
  compressOutput: {
    impact: "減少輸出token",
    implementation: "明確字數限制"
  }
};

// 預估遊戲運營成本
function estimateGameCost(dailyActiveUsers) {
  const avgAPICallsPerUser = 5; // 每日平均API調用
  const avgInputTokens = 1000; // 平均輸入長度
  const avgOutputTokens = 200; // 平均輸出長度
  const cacheHitRate = 0.7; // 70%緩存命中率
  
  const totalCalls = dailyActiveUsers * avgAPICallsPerUser;
  const cachedCalls = totalCalls * cacheHitRate;
  const freshCalls = totalCalls * (1 - cacheHitRate);
  
  const cachedCost = cachedCalls * estimateCost(
    avgInputTokens, 
    avgOutputTokens, 
    true
  );
  
  const freshCost = freshCalls * estimateCost(
    avgInputTokens, 
    avgOutputTokens, 
    false
  );
  
  const dailyCost = cachedCost + freshCost;
  
  return {
    dailyCost: dailyCost.toFixed(2),
    monthlyCost: (dailyCost * 30).toFixed(2),
    costPerUser: (dailyCost / dailyActiveUsers).toFixed(4)
  };
}

// 範例
console.log(estimateGameCost(1000)); // 1000 DAU
// 輸出: { dailyCost: "2.10", monthlyCost: "63.00", costPerUser: "0.0021" }
```

### 11.3 安全考慮

```javascript
// 輸入驗證
function validateUserInput(input) {
  // 1. 長度限制
  if (input.length > 500) {
    return { valid: false, error: "輸入過長" };
  }
  
  // 2. 內容過濾
  const bannedWords = ["API_KEY", "system:", "ignore previous"];
  for (const word of bannedWords) {
    if (input.toLowerCase().includes(word.toLowerCase())) {
      return { valid: false, error: "包含禁止詞彙" };
    }
  }
  
  // 3. 注入檢測
  if (input.includes("```") || input.includes("</system>")) {
    return { valid: false, error: "疑似注入攻擊" };
  }
  
  return { valid: true };
}

// 輸出清理
function sanitizeOutput(output) {
  // 移除可能的敏感信息
  let cleaned = output;
  
  // 移除API key (如果意外洩露)
  cleaned = cleaned.replace(/sk-[a-zA-Z0-9-]{20,}/g, "[REDACTED]");
  
  // 移除系統提示詞洩露
  cleaned = cleaned.replace(/system:/gi, "");
  
  return cleaned;
}

// 速率限制
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }
  
  checkLimit(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // 清除過期請求
    const validRequests = userRequests.filter(
      time => now - time < this.timeWindow
    );
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}

const limiter = new RateLimiter(20, 60000); // 20請求/分鐘

// 使用範例
async function safeAPIRequest(userId, systemPrompt, userMessage) {
  // 檢查速率限制
  if (!limiter.checkLimit(userId)) {
    throw new Error("請求過於頻繁,請稍後再試");
  }
  
  // 驗證輸入
  const validation = validateUserInput(userMessage);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // 調用API
  const response = await callClaudeAPI(systemPrompt, userMessage);
  
  // 清理輸出
  const cleaned = sanitizeOutput(response);
  
  return cleaned;
}
```

---

## XII. 監控與分析

### 12.1 性能監控

```javascript
// API性能追蹤器
class APIPerformanceTracker {
  constructor() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
  
  recordCall(duration, success, cached) {
    this.metrics.totalCalls++;
    
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
    
    this.metrics.totalLatency += duration;
    
    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
  
  getReport() {
    const avgLatency = this.metrics.totalLatency / this.metrics.totalCalls;
    const successRate = (this.metrics.successfulCalls / this.metrics.totalCalls) * 100;
    const cacheHitRate = (this.metrics.cacheHits / this.metrics.totalCalls) * 100;
    
    return {
      totalCalls: this.metrics.totalCalls,
      successRate: successRate.toFixed(2) + "%",
      avgLatency: avgLatency.toFixed(0) + "ms",
      cacheHitRate: cacheHitRate.toFixed(2) + "%"
    };
  }
  
  reset() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

const performanceTracker = new APIPerformanceTracker();

// 監控API調用
async function monitoredAPICall(systemPrompt, userMessage) {
  const startTime = Date.now();
  let success = false;
  let cached = false;
  
  try {
    // 檢查緩存
    const cacheKey = hashString(systemPrompt + userMessage);
    const cachedResponse = npcDialogueCache.get(cacheKey);
    
    if (cachedResponse) {
      cached = true;
      success = true;
      return cachedResponse;
    }
    
    // 調用API
    const response = await callClaudeAPI(systemPrompt, userMessage);
    success = true;
    
    // 存入緩存
    npcDialogueCache.set(cacheKey, response);
    
    return response;
    
  } catch (error) {
    success = false;
    throw error;
    
  } finally {
    const duration = Date.now() - startTime;
    performanceTracker.recordCall(duration, success, cached);
  }
}

// 定期報告
setInterval(() => {
  const report = performanceTracker.getReport();
  console.log("API性能報告:", report);
  
  // 發送到分析服務
  sendToAnalytics(report);
  
  // 重置計數器
  performanceTracker.reset();
}, 300000); // 每5分鐘
```

### 12.2 使用分析

```javascript
// 使用模式分析器
class UsageAnalyzer {
  constructor() {
    this.patterns = {
      npcInteractions: new Map(),
      divinationQueries: [],
      peakHours: new Array(24).fill(0),
      popularScenarios: new Map()
    };
  }
  
  recordNPCInteraction(npcId, depth) {
    const count = this.patterns.npcInteractions.get(npcId) || 0;
    this.patterns.npcInteractions.set(npcId, count + 1);
  }
  
  recordDivination(hexagram, question) {
    this.patterns.divinationQueries.push({
      hexagram,
      question,
      timestamp: Date.now()
    });
  }
  
  recordPeakUsage() {
    const hour = new Date().getHours();
    this.patterns.peakHours[hour]++;
  }
  
  recordScenario(scenario) {
    const count = this.patterns.popularScenarios.get(scenario) || 0;
    this.patterns.popularScenarios.set(scenario, count + 1);
  }
  
  generateInsights() {
    // 最受歡迎的NPC
    const topNPCs = Array.from(this.patterns.npcInteractions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // 高峰時段
    const peakHour = this.patterns.peakHours.indexOf(
      Math.max(...this.patterns.peakHours)
    );
    
    // 最常見的算命問題類型
    const questionTypes = this.patterns.divinationQueries
      .map(q => categorizeQuestion(q.question))
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
    
    return {
      topNPCs,
      peakHour: `${peakHour}:00`,
      questionTypes,
      totalInteractions: this.patterns.npcInteractions.size
    };
  }
}

function categorizeQuestion(question) {
  if (question.includes("未來") || question.includes("將來")) return "future";
  if (question.includes("愛情") || question.includes("感情")) return "love";
  if (question.includes("事業") || question.includes("工作")) return "career";
  if (question.includes("健康")) return "health";
  return "other";
}

const usageAnalyzer = new UsageAnalyzer();
```

### 12.3 A/B測試框架

```javascript
// A/B測試管理器
class ABTestManager {
  constructor() {
    this.experiments = new Map();
  }
  
  createExperiment(name, variants) {
    this.experiments.set(name, {
      variants,
      results: new Map()
    });
  }
  
  assignVariant(experimentName, userId) {
    // 基於用戶ID的一致性哈希
    const hash = hashString(userId + experimentName);
    const experiment = this.experiments.get(experimentName);
    const variantIndex = Math.abs(hash) % experiment.variants.length;
    
    return experiment.variants[variantIndex];
  }
  
  recordResult(experimentName, userId, metric, value) {
    const variant = this.assignVariant(experimentName, userId);
    const experiment = this.experiments.get(experimentName);
    
    if (!experiment.results.has(variant)) {
      experiment.results.set(variant, []);
    }
    
    experiment.results.get(variant).push({ metric, value });
  }
  
  analyzeExperiment(experimentName) {
    const experiment = this.experiments.get(experimentName);
    const analysis = {};
    
    for (const [variant, results] of experiment.results.entries()) {
      const metrics = results.reduce((acc, r) => {
        acc[r.metric] = acc[r.metric] || [];
        acc[r.metric].push(r.value);
        return acc;
      }, {});
      
      analysis[variant] = {};
      for (const [metric, values] of Object.entries(metrics)) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        analysis[variant][metric] = avg;
      }
    }
    
    return analysis;
  }
}

// 使用範例: 測試不同的系統提示詞
const abTest = new ABTestManager();

abTest.createExperiment("npc_personality", [
  "formal", // 正式語氣
  "casual"  // 輕鬆語氣
]);

async function testNPCDialogue(userId, npc, message) {
  const variant = abTest.assignVariant("npc_personality", userId);
  
  const systemPrompt = variant === "formal"
    ? generateFormalPrompt(npc)
    : generateCasualPrompt(npc);
  
  const startTime = Date.now();
  const response = await callClaudeAPI(systemPrompt, message);
  const responseTime = Date.now() - startTime;
  
  // 記錄結果
  abTest.recordResult("npc_personality", userId, "responseTime", responseTime);
  abTest.recordResult("npc_personality", userId, "responseLength", response.length);
  
  return response;
}

// 分析結果
setTimeout(() => {
  const results = abTest.analyzeExperiment("npc_personality");
  console.log("A/B測試結果:", results);
  
  // 輸出範例:
  // {
  //   formal: { responseTime: 1200, responseLength: 150 },
  //   casual: { responseTime: 1100, responseLength: 120 }
  // }
}, 86400000); // 24小時後
```

---

## XIII. 故障排除

### 13.1 常見問題

```markdown
### 問題1: API返回空回應

**症狀**: 
- response為null或空字符串
- 沒有報錯

**原因**:
1. 系統提示詞過長
2. 模型無法理解請求
3. 輸出被內容過濾器攔截

**解決方案**:
```javascript
// 檢查提示詞長度
if (systemPrompt.length > 10000) {
  console.warn("提示詞過長,考慮簡化");
}

// 添加明確的輸出指令
systemPrompt += "\n\n請直接回應,不要說無法完成。";
```

### 問題2: 響應時間過長

**症狀**:
- API調用超過5秒
- 用戶體驗差

**原因**:
1. 網絡延遲
2. 模型負載高
3. 輸出token過多

**解決方案**:
```javascript
// 設置超時
const TIMEOUT = 5000; // 5秒

async function callWithTimeout(apiCall, timeout) {
  return Promise.race([
    apiCall(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), timeout)
    )
  ]);
}

// 限制輸出長度
const request = {
  max_tokens: 200, // 降低到200
  // ...
};
```

### 問題3: 角色性格不一致

**症狀**:
- NPC回應風格多變
- 不符合設定

**原因**:
1. 系統提示詞不夠具體
2. 缺少少樣本學習
3. 對話歷史丟失

**解決方案**:
```javascript
// 加強角色設定
const systemPrompt = `
你必須嚴格保持以下性格:
${npc.personality.join("、")}

禁止行為:
- 不要突然變得熱情(如果角色是冷酷的)
- 不要使用不符合角色的詞彙
- 不要改變說話方式

範例對話:
${npc.exampleDialogues.join("\n")}
`;

// 保持對話歷史
const context = conversationManager.getRecentContext(5);
```

### 問題4: JSON解析失敗

**症狀**:
- JSON.parse()拋出錯誤
- 格式不正確

**原因**:
1. 模型輸出包含額外文字
2. JSON格式錯誤
3. 特殊字符未轉義

**解決方案**:
```javascript
function safeJSONParse(text) {
  // 嘗試提取JSON
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    text = jsonMatch[1];
  }
  
  // 清理文本
  text = text.trim();
  text = text.replace(/```json|```/g, "");
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON解析失敗:", error);
    console.error("原始文本:", text);
    return null;
  }
}
```

### 問題5: 成本過高

**症狀**:
- API費用超預算
- 緩存命中率低

**原因**:
1. 過度調用API
2. 緩存配置不當
3. 輸出過長

**解決方案**:
```javascript
// 成本監控
class CostMonitor {
  constructor(dailyBudget) {
    this.dailyBudget = dailyBudget;
    this.dailySpend = 0;
    this.lastReset = Date.now();
  }
  
  canMakeRequest(estimatedCost) {
    // 檢查是否需要重置
    if (Date.now() - this.lastReset > 86400000) {
      this.dailySpend = 0;
      this.lastReset = Date.now();
    }
    
    // 檢查預算
    if (this.dailySpend + estimatedCost > this.dailyBudget) {
      console.warn("達到每日預算限制");
      return false;
    }
    
    return true;
  }
  
  recordSpend(cost) {
    this.dailySpend += cost;
  }
}

const costMonitor = new CostMonitor(50); // $50/day

// 使用前檢查
if (!costMonitor.canMakeRequest(0.01)) {
  return localTemplate; // 使用本地模板
}
```
```

### 13.2 調試工具

```javascript
// API調試器
class APIDebugger {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.logs = [];
  }
  
  log(type, data) {
    if (!this.enabled) return;
    
    const entry = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    console.log(`[API Debug ${type}]`, data);
  }
  
  logRequest(systemPrompt, userMessage) {
    this.log("REQUEST", {
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length,
      systemPromptPreview: systemPrompt.slice(0, 100) + "..."
    });
  }
  
  logResponse(response, duration) {
    this.log("RESPONSE", {
      length: response.length,
      duration: duration + "ms",
      preview: response.slice(0, 100) + "..."
    });
  }
  
  logError(error) {
    this.log("ERROR", {
      type: error.type || error.name,
      message: error.message,
      stack: error.stack
    });
  }
  
  export() {
    return JSON.stringify(this.logs, null, 2);
  }
  
  clear() {
    this.logs = [];
  }
}

const debugger = new APIDebugger(process.env.NODE_ENV === "development");

// 使用範例
async function debuggedAPICall(systemPrompt, userMessage) {
  debugger.logRequest(systemPrompt, userMessage);
  
  const startTime = Date.now();
  
  try {
    const response = await callClaudeAPI(systemPrompt, userMessage);
    const duration = Date.now() - startTime;
    
    debugger.logResponse(response, duration);
    
    return response;
    
  } catch (error) {
    debugger.logError(error);
    throw error;
  }
}
```

---

## XIV. 部署檢查清單

### 14.1 上線前檢查

```markdown
## 功能檢查
- [ ] 基礎API調用正常工作
- [ ] 所有NPC對話測試通過
- [ ] 算命系統正確生成解讀
- [ ] 記憶繼承文本生成正確
- [ ] 錯誤處理機制完善
- [ ] 降級策略測試通過

## 性能檢查
- [ ] 緩存命中率 > 70%
- [ ] 平均響應時間 < 2秒
- [ ] 並發處理正常
- [ ] 內存使用穩定

## 成本檢查
- [ ] 每日成本在預算內
- [ ] 成本監控正常工作
- [ ] 本地模板覆蓋率 > 80%

## 安全檢查
- [ ] 輸入驗證正常工作
- [ ] 速率限制測試通過
- [ ] 沒有敏感信息洩露
- [ ] 注入攻擊防護有效

## 監控檢查
- [ ] 性能追蹤正常記錄
- [ ] 錯誤日誌正確上報
- [ ] 使用分析數據收集
- [ ] 告警機制設置完成
```

### 14.2 環境配置

```javascript
// 環境配置管理
const CONFIG = {
  development: {
    apiEndpoint: "https://api.anthropic.com/v1/messages",
    enableDebug: true,
    cacheEnabled: true,
    maxRetries: 3,
    timeout: 10000,
    costLimit: 10 // $10/day
  },
  
  staging: {
    apiEndpoint: "https://api.anthropic.com/v1/messages",
    enableDebug: true,
    cacheEnabled: true,
    maxRetries: 2,
    timeout: 5000,
    costLimit: 20 // $20/day
  },
  
  production: {
    apiEndpoint: "https://api.anthropic.com/v1/messages",
    enableDebug: false,
    cacheEnabled: true,
    maxRetries: 2,
    timeout: 5000,
    costLimit: 50 // $50/day
  }
};

function getConfig() {
  const env = process.env.NODE_ENV || "development";
  return CONFIG[env];
}

module.exports = { getConfig };
```

---

## XV. 附錄

### 15.1 完整代碼範例

```javascript
// kiro-claude-api.js
// 完整的Claude API整合模塊

import { getConfig } from './config.js';

class KiroClaudeAPI {
  constructor() {
    this.config = getConfig();
    this.cache = new SmartCache(100, 3600000);
    this.queue = new APIRequestQueue(3);
    this.fallback = new APIFallbackManager();
    this.tracker = new APIPerformanceTracker();
    this.monitor = new CostMonitor(this.config.costLimit);
  }
  
  // 主要接口: NPC對話
  async getNPCDialogue(npc, userMessage, conversationHistory) {
    const systemPrompt = this.generateCharacterPrompt(npc, conversationHistory);
    return await this.call(systemPrompt, userMessage, "dialogue");
  }
  
  // 主要接口: 算命解讀
  async getDivinationReading(hexagram, question, context) {
    const systemPrompt = this.generateDivinationPrompt(hexagram, context);
    return await this.call(systemPrompt, question, "divination");
  }
  
  // 主要接口: 記憶繼承
  async getMemoryText(npc, inheritanceRate, previousRun) {
    const systemPrompt = this.generateMemoryPrompt(npc, inheritanceRate, previousRun);
    return await this.call(systemPrompt, "", "memory");
  }
  
  // 核心調用方法
  async call(systemPrompt, userMessage, type) {
    // 檢查成本限制
    const estimatedCost = this.estimateCost(systemPrompt, 200);
    if (!this.monitor.canMakeRequest(estimatedCost)) {
      console.warn("成本限制,使用本地模板");
      return this.getLocalTemplate(type);
    }
    
    // 檢查緩存
    const cacheKey = this.getCacheKey(systemPrompt, userMessage);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.tracker.recordCall(0, true, true);
      return cached;
    }
    
    // 檢查是否應該降級
    if (!this.fallback.shouldUseAPI()) {
      return this.getLocalTemplate(type);
    }
    
    // 調用API
    const startTime = Date.now();
    
    try {
      const response = await this.queue.add(async () => {
        return await this.makeRequest(systemPrompt, userMessage);
      });
      
      const duration = Date.now() - startTime;
      
      // 記錄成功
      this.tracker.recordCall(duration, true, false);
      this.fallback.recordSuccess();
      this.monitor.recordSpend(estimatedCost);
      
      // 存入緩存
      this.cache.set(cacheKey, response);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 記錄失敗
      this.tracker.recordCall(duration, false, false);
      this.fallback.recordFailure();
      
      console.error("API調用失敗:", error);
      
      // 返回本地模板
      return this.getLocalTemplate(type);
    }
  }
  
  // 實際HTTP請求
  async makeRequest(systemPrompt, userMessage) {
    const response = await fetch(this.config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0.7,
        system: [{
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }],
        messages: [{
          role: "user",
          content: userMessage
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
  }
  
  // 輔助方法...
  generateCharacterPrompt(npc, history) {
    return `你正在扮演${npc.name}...`;
  }
  
  generateDivinationPrompt(hexagram, context) {
    return `你是易經大師,解讀${hexagram}...`;
  }
  
  generateMemoryPrompt(npc, rate, prev) {
    return `生成記憶繼承文本...`;
  }
  
  getCacheKey(prompt, message) {
    return hashString(prompt + message);
  }
  
  estimateCost(prompt, outputTokens) {
    return (prompt.length / 1000000) * 0.003 + (outputTokens / 1000000) * 0.015;
  }
  
  getLocalTemplate(type) {
    // 返回本地對話模板
    return TEMPLATES[type] || "...";
  }
  
  // 獲取統計報告
  getReport() {
    return {
      performance: this.tracker.getReport(),
      cache: this.cache.getStats(),
      cost: {
        daily: this.monitor.dailySpend.toFixed(2),
        remaining: (this.monitor.dailyBudget - this.monitor.dailySpend).toFixed(2)
      }
    };
  }
}

// 導出單例
export const claudeAPI = new KiroClaudeAPI();
```

### 15.2 使用範例

```javascript
// 在遊戲中使用
import { claudeAPI } from './kiro-claude-api.js';

// 範例1: NPC對話
async function talkToRed(playerMessage) {
  const response = await claudeAPI.getNPCDialogue(
    npcData.red,
    playerMessage,
    conversationHistory
  );
  
  displayDialogue("紅", response);
}

// 範例2: 算命
async function fortuneTelling(question) {
  const hexagram = throwCoins();
  const reading = await claudeAPI.getDivinationReading(
    hexagram,
    question,
    { seekerInfo: getPlayerInfo() }
  );
  
  displayReading(reading);
}

// 範例3: 輪迴時的記憶繼承
async function onReincarnation() {
  for (const npc of importantNPCs) {
    const inheritanceRate = calculateInheritance(npc);
    
    if (inheritanceRate > 0.2) {
      const memoryText = await claudeAPI.getMemoryText(
        npc,
        inheritanceRate,
        previousRunData
      );
      
      npc.memoryText = memoryText;
    }
  }
}

// 範例4: 查看統計
function showAPIStats() {
  const report = claudeAPI.getReport();
  console.log("API統計報告:", report);
}
```

---

## 📋 總結

本文檔提供了《Kiro: Observer's Dream》遊戲中Claude API整合的完整規範,包括:

✅ **基礎配置** - API端點、請求結構、緩存策略  
✅ **核心場景** - NPC對話、算命系統、記憶繼承  
✅ **錯誤處理** - 降級策略、重試機制、安全防護  
✅ **性能優化** - 批量請求、響應式緩存、預加載  
✅ **監控分析** - 性能追蹤、使用分析、A/B測試  
✅ **測試方案** - 單元測試、集成測試、性能測試  
✅ **最佳實踐** - Prompt工程、成本優化、安全考慮  

---

## 📞 支持與反饋

**文檔版本**: 4.0  
**最後更新**: 2026-01-06  
**維護團隊**: Kiro Development Team  

如有問題或建議,請聯繫開發團隊。

---

**版權所有 © 2026 Kiro Development Team**