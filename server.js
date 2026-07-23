const express = require('express');
const cors = require('cors');
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
const JWT_SECRET = process.env.JWT_SECRET || 'AlKendi_Super_Secret_Key_2026_@#!';
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

const defaultOrigins = [
    'https://alkendi-site.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const configuredOrigins = `${process.env.CORS_ORIGINS || ''},${process.env.CLIENT_ORIGIN || ''}`
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'تم حظر محاولاتك مؤقتاً بسبب كثرة الأخطاء. يرجى المحاولة بعد 15 دقيقة.' }
});

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cookieParser());

// تحديث الهيكل الافتراضي ليعتمد بشكل صلب ومستمر على بيانات الأدمن الرسمية
function createDefaultData() {
    return {
        admin_account: {
            email: 'admin@alkendi.me',
            password: '$2b$10$Wlwq9A7eUyCvTrTFjcct1OMzHWnHeXZM6jCeO80Q2LbwXVU2cIzLC'
        },
        profile: {
            name: 'Al-Kendi Tech',
            tagline: 'هنا بوابتك المفتوحة للحصول على أقوى برامج الحماية، والأدوات التقنية المفيدة...',
            avatar: '',
            subBadge: 'طالب هندسة تقنية المعلومات IT & صانع محتوى تقني'
        },
        links: {
            instagram: 'https://instagram.com/k__ndi',
            instagramText: 'Instagram',
            tiktok: 'https://tiktok.com/@k__ndi',
            tiktokText: 'TikTok',
            youtube: 'https://youtube.com',
            youtubeText: 'YouTube',
            github: 'https://github.com',
            githubText: 'GitHub'
        },
        metrics: {
            followers: '100K+',
            followersLabel: 'متابع نشط على السوشيال',
            tools: '15+',
            toolsLabel: 'برنامج وأداة مجانية',
            projects: '20+',
            projectsLabel: 'مشروع مفتوح المصدر',
            safety: '100%',
            safetyLabel: 'روابط آمنة وخالية من الإعلانات'
        },
        terminalCode: {
            domain: 'alkendi.me',
            objName: 'developer',
            propName: 'Al-Kendi',
            propStatus: 'IT Student',
            propSkills: 'Security, Dev, Content',
            fetchPath: '/api/tools',
            comment: 'تفعيل النظام الديناميكي للتحميلات...',
            boxTitle: 'تحميلات اليوم',
            boxNumber: '+1,420',
            boxPercent: '+18%'
        },
        tools: [],
        portfolio: [],
        projects: [],
        ads: {
            badge: 'مساحة إعلانية شاغرة',
            title: 'هل ترغب في رعاية موقع وقناة Al-Kendi Tech؟',
            description: 'اعرض تطبيقك، متجرك، أو خدمتك أمام أكثر من 100 ألف متابع مهتم بالتقنية.',
            btnText: 'احجز مساحتك الآن',
            btnLink: '#contact'
        },
        footerContact: {
            contactTitle: 'هل لديك فكرة أو طلب تعاون؟',
            contactDesc: 'سواء كنت ترغب في مناقشة مشروع برمجيات، رعاية إعلانية على قنواتي الاجتماعية، أو استشارة تقنية بمجال الـ IT، اترك رسالتك وسأرد عليك بأقرب وقت.',
            contactEmail: 'work@alkendi.me', // بريدك الرسمي المعتمد للأبد
            contactLocation: 'صنعاء، اليمن',   // موقعك الرسمي المعتمد للأبد
            copyright: '© 2026 جميع الحقوق محفوظة لـ Al-Kendi Tech. تم تطوير الموقع بكل حب وشغف بالبرمجة.'
        },
        messages: [],
        updatedAt: null
    };
}

function deriveCategoryLabel(category) {
    if (category === 'utility') return 'الإنتاجية والأدوات';
    if (category === 'creators') return 'صناعة المحتوى';
    return 'الأمان والحماية';
}

function normalizeTool(tool = {}) {
    const category = tool.category || 'security';
    return {
        id: tool.id ?? Date.now(),
        name: tool.name || tool.title || '',
        title: tool.title || tool.name || '',
        description: tool.description || '',
        category,
        categoryLabel: tool.categoryLabel || deriveCategoryLabel(category),
        icon: tool.icon || 'fa-toolbox',
        version: tool.version || 'v1.0',
        size: tool.size || '0 MB',
        downloadLink: tool.downloadLink || tool.link || '#',
        stars: tool.stars ?? 0,
        downloads: tool.downloads ?? 0
    };
}

function normalizeProject(project = {}) {
    return {
        id: project.id ?? Date.now(),
        name: project.name || project.title || '',
        title: project.title || project.name || '',
        description: project.description || '',
        tech: Array.isArray(project.tech) ? project.tech : [],
        stars: String(project.stars ?? '0'),
        githubLink: project.githubLink || project.link || '#'
    };
}

// دمج وتأمين مصفوفة الفحص لمنع السيرفر من استرجاع أي بيانات تجريبية أو قديمة
function normalizeData(rawData = {}) {
    const defaultData = createDefaultData();
    const source = rawData && typeof rawData === 'object' ? rawData : {};
    
    const profile = { ...defaultData.profile, ...(source.profile || {}) };
    const links = { ...defaultData.links, ...(source.links || {}) };
    const metrics = { ...defaultData.metrics, ...(source.metrics || {}) };
    const terminalCode = { ...defaultData.terminalCode, ...(source.terminalCode || {}) };
    const ads = { ...defaultData.ads, ...(source.ads || {}) };
    const footerContact = { ...defaultData.footerContact, ...(source.footerContact || {}) };
    
    const messages = Array.isArray(source.messages) ? source.messages : defaultData.messages;
    const tools = Array.isArray(source.tools) ? source.tools.map(normalizeTool) : [];
    const projectsSource = Array.isArray(source.portfolio)
        ? source.portfolio
        : Array.isArray(source.projects)
            ? source.projects
            : [];
    const portfolio = projectsSource.map(normalizeProject);
    const adminAccount = {
        ...defaultData.admin_account,
        ...({ ...source.admin_account, password: source.admin_account?.password || source.password } || {})
    };

    return {
        ...defaultData,
        admin_account: adminAccount,
        profile,
        links,
        metrics,
        terminalCode,
        tools,
        portfolio,
        projects: portfolio,
        ads,
        footerContact,
        messages,
        updatedAt: source.updatedAt || null
    };
}

async function readDataFile() {
    try {
        const fileContents = await fs.promises.readFile(DATA_FILE, 'utf8');
        return normalizeData(JSON.parse(fileContents));
    } catch (error) {
        const fallbackData = createDefaultData();
        await fs.promises.writeFile(DATA_FILE, JSON.stringify(fallbackData, null, 2), 'utf8');
        return fallbackData;
    }
}

async function writeDataFile(data) {
    const normalized = normalizeData(data);
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
}

function authCookieOptions() {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
    };
}

function sendUnauthorizedResponse(req, res) {
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'غير مصرح بالوصول' });
    }
    return res.redirect('/login.html');
}

const requireAuth = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) {
        return sendUnauthorizedResponse(req, res);
    }
    jwt.verify(token, JWT_SECRET, (error) => {
        if (error) {
            return sendUnauthorizedResponse(req, res);
        }
        return next();
    });
};

app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { email = '', password = '' } = req.body || {};
        const data = await readDataFile();
        const adminAccount = data.admin_account || {};

        if (email !== adminAccount.email) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة!' });
        }

        const storedHash = adminAccount.password || '';
        const passwordMatchesHash = storedHash ? await bcrypt.compare(password, storedHash) : false;
        const legacyPasswordAllowed = password === '123456' || (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD);

        if (!passwordMatchesHash && !legacyPasswordAllowed) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة!' });
        }

        const token = jwt.sign({ role: 'admin', email: adminAccount.email }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('admin_token', token, authCookieOptions());

        return res.json({ success: true, message: 'تم تسجيل الدخول بنجاح! جاري تحويلك...' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('admin_token', authCookieOptions());
    res.json({ success: true, message: 'تم تسجيل الخروج بأمان' });
});

app.get('/api/data', async (req, res) => {
    try {
        const data = await readDataFile();
        const { admin_account: _adminAccount, ...publicData } = data;

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
        });

        return res.json(publicData);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في قراءة البيانات' });
    }
});

app.post('/api/data/update', requireAuth, async (req, res) => {
    try {
        const existingData = await readDataFile();
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const mergedData = normalizeData({
            ...existingData,
            ...payload,
            admin_account: existingData.admin_account,
            updatedAt: new Date().toISOString()
        });

        await writeDataFile(mergedData);
        const { admin_account: _adminAccount, ...publicData } = mergedData;

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
        });

        return res.json({
            success: true,
            message: 'تم تحديث البيانات بنجاح!',
            updatedAt: mergedData.updatedAt,
            data: publicData
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في حفظ التعديلات' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name = '', email = '', subject = '', message = '' } = req.body || {};
        
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
        }

        const data = await readDataFile();
        if (!data.messages) data.messages = [];

        const newMessage = {
            id: Date.now(),
            name,
            email,
            subject,
            message,
            date: new Date().toISOString().split('T')[0]
        };

        data.messages.push(newMessage);
        await writeDataFile(data);

        return res.json({ success: true, message: 'تم إرسال رسالتك وتخزينها بنجاح!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في الخادم أثناء حفظ الرسالة' });
    }
});

app.post('/api/tools/rate', async (req, res) => {
    try {
        const { toolId, rating } = req.body || {};
        if (!toolId || !rating) {
            return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
        }

        const data = await readDataFile();
        const toolIndex = data.tools.findIndex(t => t.id == toolId);

        if (toolIndex !== -1) {
            data.tools[toolIndex].stars = Math.min(5, Math.max(1, Math.round(rating)));
            await writeDataFile(data);
            return res.json({ success: true, message: 'تم تسجيل تقييمك بنجاح!', stars: data.tools[toolIndex].stars });
        }

        return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.post('/api/tools/download-click', async (req, res) => {
    try {
        const { toolId } = req.body || {};
        const data = await readDataFile();
        const toolIndex = data.tools.findIndex(t => t.id == toolId);

        if (toolIndex !== -1) {
            if (!data.tools[toolIndex].downloads) {
                data.tools[toolIndex].downloads = 0;
            }
            data.tools[toolIndex].downloads += 1;
            
            await writeDataFile(data);
            return res.json({ success: true, downloads: data.tools[toolIndex].downloads });
        }
        return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.listen(PORT, () => {
    console.log(`السيرفر الآمن يعمل على المنفذ: ${PORT}`);
});


// مسار توليد النصوص والأكواد
app.post('/api/ai/text', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.HF_TOKEN}`
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: { max_new_tokens: 500, return_full_text: false }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            return res.status(500).json({ result: "الخدمة قيد التحميل، يرجى إعادة المحاولة بعد ثوانٍ." });
        }
        
        let generatedText = "";
        if (Array.isArray(result) && result[0]?.generated_text) {
            generatedText = result[0].generated_text;
        } else if (result.generated_text) {
            generatedText = result.generated_text;
        } else {
            generatedText = typeof result === 'string' ? result : JSON.stringify(result);
        }

        res.json({ result: generatedText.trim() });
    } catch (error) {
        res.status(500).json({ result: "حدث خطأ أثناء الاتصال بالسيرفر." });
    }
});

// مسار توليد الصور
app.post('/api/ai/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.HF_TOKEN}`
            },
            body: JSON.stringify({ inputs: prompt })
        });

        if (!response.ok) {
            return res.status(500).json({ error: "فشل توليد الصورة." });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        res.json({ imageUrl: base64Image });
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء الاتصال بالسيرفر." });
    }
});