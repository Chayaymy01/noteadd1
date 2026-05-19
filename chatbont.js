// บรรทัดที่ 1: ใส่คีย์ของคุณให้ถูกต้อง
const GEMINI_API_KEY = "AIzaSyDn2USgTX7DiuFrYtl1UzOirc4NnMnO57M";

// บรรทัดที่ 2: แก้ไขโครงสร้าง URL ใหม่ให้ถูกต้องตามมาตรฐานของ Google (แนะนำใช้ gemini-2.5-flash ตัวล่าสุด)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2. ฟังก์ชันหลักในการทำงานเมื่อมีการส่งข้อความ
async function sendMessage() {
    const inputElement = document.getElementById('chat-input');
    const userMessage = inputElement.value.trim();

    // ถ้าไม่มีข้อความ หรือช่องว่าง ไม่ต้องทำงาน
    if (!userMessage) return;

    // แสดงข้อความที่เราพิมพ์ขึ้นหน้าจอฝั่งขวา (User) และล้างช่องอินพุตเดิม
    addChatMessage('user', userMessage);
    inputElement.value = '';

    // แสดงสถานะว่า AI กำลังประมวลผลคิดคำตอบ
    const thinkingId = addChatMessage('bot', 'กำลังคิดคำตอบสักครู่...');

    try {
        // ยิง Fetch ขอข้อมูลไปยังระบบของ Google Gemini
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // ปรับปรุงการส่งข้อมูลให้มี System Instruction ที่แยกส่วนชัดเจนตาม Format ของ v1beta
                systemInstruction: {
                    parts: [{ text: "คุณคือผู้ช่วย AI อัจฉริยะที่ฝังอยู่ในแอปพลิเคชันจดบันทึก (Smart Note App) คอยช่วยเหลือ แนะนำไอเดีย และตอบคำถามเป็นภาษาไทยอย่างสุภาพเป็นกันเอง" }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: userMessage }]
                }]
            })
        });

        // ตรวจสอบว่า HTTP Status ทำงานปกติหรือไม่ (ป้องกัน Error 404/400)
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ? errorData.error.message : `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // ลบข้อความ "กำลังคิดคำตอบสักครู่..." แถวเดิมทิ้งก่อน
        const thinkingElement = document.getElementById(thinkingId);
        if (thinkingElement) thinkingElement.remove();

        // ตรวจสอบโครงสร้างข้อมูลอย่างปลอดภัย
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const botResponse = data.candidates[0].content.parts[0].text;
            // แสดงข้อความคำตอบจริงจากบอทลงบนหน้าแชท
            addChatMessage('bot', botResponse);
        } else {
            console.error("API Response Structure Error:", data);
            addChatMessage('bot', 'โครงสร้างข้อมูลตอบกลับไม่ถูกต้อง');
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        
        // หากระบบเกิดข้อผิดพลาด ให้เปลี่ยนข้อความแถวเดิมเป็นแจ้งเตือนผู้ใช้แทนการลบทิ้ง
        const thinkingElement = document.getElementById(thinkingId);
        if (thinkingElement) {
            thinkingElement.innerText = `ขออภัยครับ เกิดข้อผิดพลาด: ${error.message}`;
        }
    }
}

// 3. ฟังก์ชันสำหรับสร้างกล่อง Element นำคำพูดไปแปะบนหน้าต่าง UI แชท
function addChatMessage(sender, text) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    
    const uniqueId = 'msg-' + Math.random().toString(36).substring(2, 9);
    msgDiv.id = uniqueId;
    
    msgDiv.className = sender === 'bot' ? 'bot-msg' : 'user-msg';
    msgDiv.innerText = text;
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    return uniqueId;
}