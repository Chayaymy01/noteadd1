const API_URL = 'http://localhost:8888/notes';
const TMPL_URL = 'http://localhost:8888/templates';

async function fetchTemplates() {
    try {
        const res = await fetch(TMPL_URL);
        const data = await res.json();
        
        // ชี้ไปที่ ID ของกล่องฝั่งซ้ายที่คุณสร้างไว้
        const list = document.getElementById('template-list');
        list.innerHTML = ''; // ล้างข้อมูลเก่าออก

        if (data && data.length > 0) {
            data.forEach(t => {
                const item = document.createElement('div');
                item.className = 'template-item'; // ใช้ Class เดิมเพื่อความสวยงาม
                
                // แสดงชื่อเทมเพลตที่ดึงมาจาก Postgres (name)
                item.innerHTML = `
                    <strong>${t.name}</strong>
                    <p class="tmpl-preview">${t.content ? t.content.substring(0, 20) : ''}...</p>
                `;

                // เมื่อคลิกที่เมนูฝั่งซ้าย ให้เนื้อหาไปโผล่ในกระดาษฝั่งขวา
                item.onclick = () => {
                    document.getElementById('content').value = t.content;
                    addChatMessage('bot', `เปิดเทมเพลต "${t.name}" ให้แล้วครับ`);
                };

                list.appendChild(item);
            });
        }
    } catch (e) {
        console.error("เชื่อมต่อหลังบ้านไม่ได้:", e);
        document.getElementById('template-list').innerHTML = '<p style="color:red; padding:10px;">โหลดข้อมูลไม่สำเร็จ</p>';
    }
}

async function addNote() {
    const titleVal = document.getElementById('title').value;
    const contentVal = document.getElementById('content').value;

    if (!titleVal || !contentVal) {
        alert("กรุณากรอกข้อมูลให้ครบครับ");
        return;
    }

    // ข้อมูลส่งไป Go Backend
    const noteData = { 
        user_id: 1,      
        template_id: 1,  
        title: titleVal,
        content: contentVal
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (response.ok) {
            // เมื่อบันทึกสำเร็จ เตรียมข้อมูลและสั่ง Export PDF ทันที
            const noteInfo = { 
                title: titleVal, 
                content: contentVal, 
                date: new Date().toLocaleString() 
            };
            
            // เรียกฟังก์ชันสร้าง PDF ทันที
            exportToPDF(noteInfo);

            alert("บันทึกข้อมูลและดาวน์โหลด PDF เรียบร้อย!");

            // ล้างหน้าจอ
            document.getElementById('title').value = '';
            document.getElementById('content').value = '';
            if (typeof fetchNotes === "function") fetchNotes();
            
        } else {
            // กรณี Error 500 (อ้างอิงจาก log ใน Terminal)
            alert("Error: ไม่สามารถบันทึกได้ ตรวจสอบว่ามี User ID 1 และ Template ID 1 ในฐานข้อมูลหรือยัง?");
        }
    } catch (e) {
        alert("ติดต่อ Server ไม่ได้");
    }
}

// สั่งให้ทำงานทันทีเมื่อเปิดหน้าเว็บ
window.onload = () => {
    fetchTemplates();
    if (typeof fetchNotes === "function") fetchNotes(); // ดึงโน้ตเดิมถ้ามีฟังก์ชันนี้
};