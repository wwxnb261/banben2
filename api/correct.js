// Vercel API 端点 - 解决跨域问题
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        // 从环境变量获取API密钥
        const APP_KEY = process.env.YOUDAO_APP_KEY;
        const APP_SECRET = process.env.YOUDAO_APP_SECRET;
        
        if (!APP_KEY || !APP_SECRET) {
            res.status(500).json({ error: 'API keys not configured' });
            return;
        }
        
        // 获取请求参数
        const { q, grade, title, isNeedSynonyms, correctVersion, isNeedEssayReport } = req.body;
        
        // 生成认证参数
        const salt = generateUUID();
        const curtime = Math.round(new Date().getTime() / 1000);
        const sign = calculateSign(APP_KEY, APP_SECRET, q, salt, curtime);
        
        // 构建请求参数
        const params = new URLSearchParams();
        params.append('q', q);
        params.append('grade', grade || 'junior');
        params.append('title', title || '');
        params.append('isNeedSynonyms', isNeedSynonyms || 'true');
        params.append('correctVersion', correctVersion || 'advanced');
        params.append('isNeedEssayReport', isNeedEssayReport || 'true');
        params.append('appKey', APP_KEY);
        params.append('salt', salt);
        params.append('sign', sign);
        params.append('signType', 'v3');
        params.append('curtime', curtime);
        
        // 调用有道API
        const response = await fetch('https://openapi.youdao.com/v2/correct_writing_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        const result = await response.json();
        res.status(200).json(result);
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// 生成UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 计算签名
function calculateSign(appKey, appSecret, q, salt, curtime) {
    const crypto = require('crypto');
    const input = getInput(q);
    const str = appKey + input + salt + curtime + appSecret;
    return crypto.createHash('sha256').update(str).digest('hex');
}

// 获取输入字符串
function getInput(input) {
    if (!input) return '';
    
    const inputLen = input.length;
    if (inputLen <= 20) {
        return input;
    }
    
    return input.substring(0, 10) + inputLen + input.substring(inputLen - 10);
}