// 全局变量
let currentMode = 'timed'; // 'timed' 或 'free'
let timer = null;
let startTime = null;
let currentImage = null;
let stream = null;

// API配置 - 使用代理端点解决跨域问题
const API_CONFIG = {
    // 在生产环境中，API密钥通过环境变量配置
    API_URL: '/api/correct' // 使用Vercel API代理端点
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 绑定事件监听器
    bindEventListeners();
    
    // 显示考试说明界面
    showScreen('exam-instructions');
}

function bindEventListeners() {
    // 文本输入监听
    const essayContent = document.getElementById('essay-content');
    if (essayContent) {
        essayContent.addEventListener('input', updateWordCount);
    }
    
    // 考试类型选择监听
    const examTypeSelect = document.getElementById('exam-type-select');
    if (examTypeSelect) {
        examTypeSelect.addEventListener('change', updateExamType);
    }
}

// 界面切换函数
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function closeModal() {
    // 这里可以添加关闭模态框的逻辑
    // 目前保持在考试说明界面
}

function switchMode(mode) {
    currentMode = mode;
    const modeBtn = document.getElementById('free-mode-btn');
    if (mode === 'free') {
        modeBtn.textContent = '切换为限时写作模式';
        modeBtn.onclick = () => switchMode('timed');
    } else {
        modeBtn.textContent = '切换为自由写作模式';
        modeBtn.onclick = () => switchMode('free');
    }
}

function startExam() {
    showScreen('writing-screen');
    if (currentMode === 'timed') {
        startTimer();
    }
    
    // 重置界面
    resetWritingInterface();
}

function resetWritingInterface() {
    document.getElementById('essay-title').value = '';
    document.getElementById('essay-content').value = '';
    document.getElementById('word-count').textContent = '0';
    hideImagePreview();
    resetScoreDisplay();
}

function startTimer() {
    startTime = new Date();
    timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!startTime) return;
    
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = timeString;
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateWordCount() {
    const content = document.getElementById('essay-content').value;
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    document.getElementById('word-count').textContent = words.length;
}

function updateExamType() {
    const examType = document.getElementById('exam-type-select').value;
    // 这里可以根据考试类型调整界面或逻辑
    console.log('考试类型已切换为:', examType);
}

// 图片上传相关函数
function openFileUpload() {
    document.getElementById('file-input').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImage = e.target.result;
            showImagePreview(currentImage);
        };
        reader.readAsDataURL(file);
    } else {
        showMessage('请选择有效的图片文件', 'error');
    }
}

function showImagePreview(imageSrc) {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    
    img.src = imageSrc;
    preview.style.display = 'block';
}

function hideImagePreview() {
    const preview = document.getElementById('image-preview');
    preview.style.display = 'none';
    currentImage = null;
}

function removeImage() {
    hideImagePreview();
    document.getElementById('file-input').value = '';
}

// 摄像头相关函数
function openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    modal.style.display = 'flex';
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(mediaStream) {
            stream = mediaStream;
            video.srcObject = mediaStream;
        })
        .catch(function(error) {
            console.error('无法访问摄像头:', error);
            showMessage('无法访问摄像头，请检查权限设置', 'error');
            closeCamera();
        });
}

function closeCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    modal.style.display = 'none';
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    video.srcObject = null;
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    currentImage = canvas.toDataURL('image/jpeg', 0.8);
    showImagePreview(currentImage);
    
    closeCamera();
}

// API调用相关函数
// 认证相关函数已移至后端API，前端不再需要

async function submitEssay() {
    
    const title = document.getElementById('essay-title').value.trim();
    const content = document.getElementById('essay-content').value.trim();
    const examType = document.getElementById('exam-type-select').value;
    
    // 验证输入
    if (!content && !currentImage) {
        showMessage('请输入作文内容或上传图片', 'error');
        return;
    }
    
    // 显示加载状态
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading"></span> 批改中...';
    submitBtn.disabled = true;
    
    try {
        let result;
        
        if (currentImage) {
            // 图片批改
            result = await submitImageEssay(title, examType, currentImage);
        } else {
            // 文本批改
            result = await submitTextEssay(title, content, examType);
        }
        
        if (result && result.errorCode === '0') {
            displayResult(result.Result);
            showScreen('result-screen');
            stopTimer();
        } else {
            showMessage('批改失败: ' + (result?.errorCode || '未知错误'), 'error');
        }
        
    } catch (error) {
        console.error('提交失败:', error);
        showMessage('提交失败，请检查网络连接', 'error');
    } finally {
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function submitImageEssay(title, grade, imageData) {
    // 移除data:image/jpeg;base64,前缀
    const base64Data = imageData.split(',')[1];
    
    const requestBody = {
        q: base64Data,
        grade: grade,
        title: title,
        isNeedSynonyms: 'true',
        correctVersion: 'advanced',
        isNeedEssayReport: 'true'
    };
    
    const response = await fetch(API_CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    return await response.json();
}

async function submitTextEssay(title, content, grade) {
    // 对于文本输入，我们需要使用文本批改API
    // 这里使用图片API的方式，将文本转换为图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = 800;
    canvas.height = 600;
    
    // 设置背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 设置文本样式
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    
    // 绘制标题
    if (title) {
        ctx.font = 'bold 20px Arial';
        ctx.fillText(title, 50, 50);
        ctx.font = '16px Arial';
    }
    
    // 绘制内容（简单的文本换行）
    const lines = wrapText(ctx, content, 50, title ? 100 : 50, canvas.width - 100, 20);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    return await submitImageEssay(title, grade, imageData);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    
    ctx.fillText(line, x, currentY);
    return currentY;
}

// 结果显示相关函数
function displayResult(result) {
    // 更新基本信息
    document.getElementById('result-score').textContent = result.totalScore || 0;
    document.getElementById('result-word-count').textContent = result.wordNum || 0;
    document.getElementById('result-char-count').textContent = result.rawEssay?.length || 0;
    document.getElementById('result-sent-count').textContent = result.sentNum || 0;
    document.getElementById('result-para-count').textContent = result.paraNum || 0;
    
    // 更新语法错误信息
    const grammarErrors = countGrammarErrors(result.essayFeedback);
    document.getElementById('result-grammar-errors').textContent = grammarErrors.total;
    document.getElementById('result-advanced-errors').textContent = grammarErrors.advanced || '无';
    
    // 更新评价信息
    if (result.majorScore) {
        document.getElementById('grammar-feedback').textContent = result.majorScore.grammarAdvice || '语法表现良好';
        document.getElementById('vocabulary-feedback').textContent = result.majorScore.wordAdvice || '词汇使用恰当';
        document.getElementById('structure-feedback').textContent = result.majorScore.structureAdvice || '结构清晰合理';
    }
    
    // 更新考试类型显示
    const examTypeSelect = document.getElementById('exam-type-select');
    const examTypeText = examTypeSelect.options[examTypeSelect.selectedIndex].text;
    document.getElementById('result-exam-type').textContent = examTypeText;
    
    // 生成详细报告
    generateDetailedReport(result);
}

function countGrammarErrors(essayFeedback) {
    if (!essayFeedback || !essayFeedback.sentsFeedback) {
        return { total: 0, advanced: 0 };
    }
    
    let total = 0;
    let advanced = 0;
    let advancedTypes = [];
    
    essayFeedback.sentsFeedback.forEach(sent => {
        if (sent.errorPosInfos && sent.errorPosInfos.length > 0) {
            total += sent.errorPosInfos.length;
            
            sent.errorPosInfos.forEach(error => {
                if (error.vip || error.showType === 2) {
                    advanced++;
                    if (error.errorTypeTitle && !advancedTypes.includes(error.errorTypeTitle)) {
                        advancedTypes.push(error.errorTypeTitle);
                    }
                }
            });
        }
    });
    
    return {
        total,
        advanced: advancedTypes.length > 0 ? advancedTypes.join('、') : 0
    };
}

function generateDetailedReport(result) {
    const reportContent = document.getElementById('detailed-report-content');
    
    if (!result.essayFeedback || !result.essayFeedback.sentsFeedback) {
        reportContent.innerHTML = '<p>暂无详细报告数据</p>';
        return;
    }
    
    let html = '<div class="sentence-feedback">';
    
    result.essayFeedback.sentsFeedback.forEach((sent, index) => {
        html += `<div class="sentence-item">`;
        html += `<h5>第${index + 1}句</h5>`;
        html += `<p class="original-sentence">${sent.rawSent}</p>`;
        
        if (sent.errorPosInfos && sent.errorPosInfos.length > 0) {
            html += '<div class="errors">';
            sent.errorPosInfos.forEach(error => {
                html += `<div class="error-item">`;
                html += `<span class="error-type">${error.errorTypeTitle}</span>`;
                html += `<span class="error-desc">${error.errBaseInfo}</span>`;
                html += `</div>`;
            });
            html += '</div>';
        } else {
            html += '<p class="no-errors">✓ 无语法错误</p>';
        }
        
        html += '</div>';
    });
    
    html += '</div>';
    reportContent.innerHTML = html;
}

function resetScoreDisplay() {
    document.getElementById('total-score').textContent = '0';
    document.getElementById('error-count').textContent = '0';
    document.getElementById('basic-error-count').textContent = '0';
    document.getElementById('advanced-error-count').textContent = '0';
    document.getElementById('polish-count').textContent = '0';
    document.getElementById('example-count').textContent = '0';
}

function backToWriting() {
    showScreen('writing-screen');
    if (currentMode === 'timed' && !timer) {
        startTimer();
    }
}

// 工具函数
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    // 添加到页面
    const container = document.querySelector('.screen.active') || document.body;
    container.insertBefore(messageDiv, container.firstChild);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// 添加CryptoJS库的简化版本（仅SHA256）
const CryptoJS = {
    SHA256: function(message) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        
        function sha256(message) {
            const h = [
                0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
            ];
            
            const k = [
                0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
            ];
            
            // 预处理
            const msgBytes = new TextEncoder().encode(message);
            const msgBits = msgBytes.length * 8;
            const msgArray = Array.from(msgBytes);
            
            msgArray.push(0x80);
            
            while (msgArray.length % 64 !== 56) {
                msgArray.push(0);
            }
            
            // 添加长度
            for (let i = 7; i >= 0; i--) {
                msgArray.push((msgBits >>> (i * 8)) & 0xff);
            }
            
            // 处理消息块
            for (let chunk = 0; chunk < msgArray.length; chunk += 64) {
                const w = new Array(64);
                
                for (let i = 0; i < 16; i++) {
                    w[i] = (msgArray[chunk + i * 4] << 24) |
                           (msgArray[chunk + i * 4 + 1] << 16) |
                           (msgArray[chunk + i * 4 + 2] << 8) |
                           msgArray[chunk + i * 4 + 3];
                }
                
                for (let i = 16; i < 64; i++) {
                    const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                    const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
                }
                
                let [a, b, c, d, e, f, g, h_val] = h;
                
                for (let i = 0; i < 64; i++) {
                    const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
                    const ch = (e & f) ^ (~e & g);
                    const temp1 = (h_val + S1 + ch + k[i] + w[i]) >>> 0;
                    const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
                    const maj = (a & b) ^ (a & c) ^ (b & c);
                    const temp2 = (S0 + maj) >>> 0;
                    
                    h_val = g;
                    g = f;
                    f = e;
                    e = (d + temp1) >>> 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (temp1 + temp2) >>> 0;
                }
                
                h[0] = (h[0] + a) >>> 0;
                h[1] = (h[1] + b) >>> 0;
                h[2] = (h[2] + c) >>> 0;
                h[3] = (h[3] + d) >>> 0;
                h[4] = (h[4] + e) >>> 0;
                h[5] = (h[5] + f) >>> 0;
                h[6] = (h[6] + g) >>> 0;
                h[7] = (h[7] + h_val) >>> 0;
            }
            
            return h.map(x => x.toString(16).padStart(8, '0')).join('');
        }
        
        return {
            toString: () => sha256(message)
        };
    }
};