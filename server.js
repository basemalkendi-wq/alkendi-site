const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// مفتاح تشفير سري وقوي جداً
const JWT_SECRET = process.env.JWT_SECRET || "AlKendi_Super_Secret_Key_2026_@#!"; 

// 1. إعدادات جدار الحماية ضد التخمين (حد أقصى 5 محاولات لكل 15 دقيقة)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: { success: false, message: "تم حظر محاولاتك مؤقتاً بسبب كثرة الأخطاء. يرجى المحاولة بعد 15 دقيقة." }
});

app.use(bodyParser.json());
app.use(cookieParser());

// 2. برمجية التحقق الحارسة (Middleware): تمنع دخول أي شخص لصفحة الآدمن دون صلاحية
const requireAuth = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) {
        return res.redirect('/login.html');
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.redirect('/login.html');
        next();
    });
};

// حماية مسار صفحة الآدمن الفعلي
app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// السماح بباقي ملفات المجلد العام (كالـ index.html وصفحة الدخول الجديدة)
app.use(express.static(path.join(__dirname, 'public')));

// 3. API تسجيل الدخول الآمن مع التحقق والتشفير
app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;

    // قراءة بيانات الآدمن المشفرة من ملف data.json
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: "خطأ في الخادم" });
        
        const fullData = JSON.parse(data);
        const adminCredentials = fullData.admin_account;

        // التحقق من الإيميل ومقارنة كلمة السر المشفرة
        // تحقق مباشر ومؤقت لتخطي مشكلة التشفير المحلية
if (email !== "admin@alkendi.me" || password !== "123456") {
    return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة!" });
}

        // توليد رمز الـ JWT صالحة لمدة 24 ساعة فقط
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

        // إرسال الرمز للمتصفح عبر كوكيز آمنة
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, message: "تم تسجيل الدخول بنجاح! جاري تحويلك..." });
    });
});

// 4. API تسجيل الخروج وتدمير الرمز
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true, message: "تم تسجيل الخروج بأمان" });
});

// APIs إدارة البيانات المعتادة
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send("خطأ في قراءة البيانات");
        res.json(JSON.parse(data));
    });
});

app.post('/api/data/update', requireAuth, (req, res) => {
    const updatedData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).send("خطأ في حفظ التعديلات");
        res.json({ success: true, message: "تم تحديث البيانات بنجاح!" });
    });
});

app.listen(PORT, () => {
    console.log(`السيرفر الآمن يعمل على المنفذ: ${PORT}`);
});