const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

// 配置Express应用
const app = express();
const PORT = 3000;

// 配置CORS - 允许所有来源（开发环境）
// // 生产环境应指定具体的域名，例如：
// const corsOptions = {
//   origin: 'http://b6a58fd3.natappfree.cc',
//   credentials: true
// };
// app.use(cors(corsOptions));

// 开发环境配置 - 允许所有来源
app.use(cors({
    origin: ['http://b6a58fd3.natappfree.cc/', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true
}));

// 1. 配置根目录的静态文件服务（重点！）
app.use(express.static(path.join(__dirname, 'public')));

// 2. 配置API图片路径的静态文件服务（保持原有配置）
app.use('/api/images', express.static(path.join(__dirname, 'public/images')));

// 解析JSON请求体
app.use(express.json());

// 在所有 API 路由中添加缓存控制头
app.use('/api', (req, res, next) => {
    // 设置缓存控制头 - 客户端可以缓存1小时
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    next();
});

// 配置Multer存储引擎
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/images'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 存储操作日志的文件
const operationLogPath = path.join(__dirname, 'operation_log.json');
// 存储IP操作频率的文件
const ipOperationsPath = path.join(__dirname, 'ip_operations.json');

// 初始化文件
async function initOperationFiles() {
    try {
        await fs.access(operationLogPath);
    } catch (error) {
        await fs.writeFile(operationLogPath, JSON.stringify([]));
    }

    try {
        await fs.access(ipOperationsPath);
    } catch (error) {
        await fs.writeFile(ipOperationsPath, JSON.stringify([]));
    }
}

// 读取操作日志
async function readOperationLog() {
    try {
        const data = await fs.readFile(operationLogPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading operation log:', error);
        return [];
    }
}

// 写入操作日志
async function writeOperationLog(logs) {
    try {
        await fs.writeFile(operationLogPath, JSON.stringify(logs));
    } catch (error) {
        console.error('Error writing operation log:', error);
    }
}

// 读取IP操作记录
async function readIpOperations() {
    try {
        const data = await fs.readFile(ipOperationsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading IP operations:', error);
        return [];
    }
}

// 写入IP操作记录
async function writeIpOperations(records) {
    try {
        await fs.writeFile(ipOperationsPath, JSON.stringify(records));
    } catch (error) {
        console.error('Error writing IP operations:', error);
    }
}

// 获取客户端IP
function getClientIp(req) {
    return req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        'unknown';
}

// 操作日志中间件
async function logOperation(req, res, next) {
    const clientIp = getClientIp(req);
    const operationDesc = req.headers['x-operation-desc']
        ? decodeURIComponent(req.headers['x-operation-desc'])
        : `${req.method} ${req.path}`;

    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: clientIp,
        operation: operationDesc,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent']
    };

    // 记录操作日志
    const logs = await readOperationLog();
    logs.push(logEntry);

    // 保持最近30天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = logs.filter(log => {
        return new Date(log.timestamp) > thirtyDaysAgo;
    });

    await writeOperationLog(recentLogs);

    // 传递操作描述到后续处理
    res.locals.operationDesc = operationDesc;

    next();
}

// IP操作频率限制中间件
async function operationRateLimiter(req, res, next) {
    const clientIp = getClientIp(req);
    const operations = await readIpOperations();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // 过滤出24小时内的操作
    const recentOperations = operations.filter(op => {
        return new Date(op.timestamp) > twentyFourHoursAgo && op.ip === clientIp;
    });

    // 检查是否超过限制（8次/24小时）
    if (recentOperations.length >= 8) {
        return res.status(429).json({
            error: '操作频率超限',
            message: '单个IP 24小时内最多进行8次操作',
            remaining: 0,
            resetTime: Math.ceil((twentyFourHoursAgo.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000)
        });
    }

    // 添加新操作记录
    operations.push({
        ip: clientIp,
        timestamp: now.toISOString(),
        method: req.method,
        path: req.path
    });

    // 清理过期记录
    const cleanedOperations = operations.filter(op => {
        return new Date(op.timestamp) > twentyFourHoursAgo;
    });

    // 保存记录
    await writeIpOperations(cleanedOperations);

    // 在响应中包含剩余次数信息
    res.setHeader('X-RateLimit-Limit', 8);
    res.setHeader('X-RateLimit-Remaining', 8 - recentOperations.length - 1);

    next();
}

// 初始化操作文件
initOperationFiles();

// 模拟鸟类数据
let birds = [];
const DATA_FILE = path.join(__dirname, 'data.json');

// 初始化数据
async function initData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        birds = JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或有错误，使用空数组
        birds = [];
    }
}

// 保存数据
async function saveData() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(birds, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// 3. 添加根路径路由（确保访问/时返回index.html）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取鸟类列表
app.get('/api/birds', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const pageSize = 48;

        let filteredBirds = birds;

        if (search) {
            filteredBirds = birds.filter(bird =>
                bird.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedBirds = filteredBirds.slice(startIndex, endIndex);

        const hasMore = endIndex < filteredBirds.length;

        res.json({
            birds: paginatedBirds,
            hasMore: hasMore
        });
    } catch (error) {
        console.error('Error fetching birds:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 获取鸟类总数和种类数
app.get('/api/birds/count', async (req, res) => {
    try {
        // 计算不重复的鸟类名称数量
        const uniqueBirdNames = new Set(birds.map(bird => bird.name));

        res.json({
            count: birds.length,
            type: uniqueBirdNames.size
        });
    } catch (error) {
        console.error('Error fetching bird count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 获取单只鸟类
app.get('/api/birds/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const bird = birds.find(bird => bird.id === id);

        if (!bird) {
            return res.status(404).json({ error: 'Bird not found' });
        }

        res.json(bird);
    } catch (error) {
        console.error('Error fetching bird:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 添加新鸟类
app.post('/api/birds', operationRateLimiter, logOperation, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;

        // 验证名称长度
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (name.length > 10) {
            return res.status(400).json({ error: 'Name cannot exceed 10 characters' });
        }

        // 验证图片大小
        if (req.file && req.file.size > 1048576) {
            return res.status(400).json({ error: 'Image size cannot exceed 1MB' });
        }

        const newBird = {
            id: Date.now(),
            name: name,
            imageUrl: req.file ? req.file.filename : null
        };

        birds.unshift(newBird);
        await saveData();

        res.status(201).json({
            ...newBird,
            operation: res.locals.operationDesc
        });
    } catch (error) {
        console.error('Error creating bird:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 更新鸟类
app.put('/api/birds/:id', operationRateLimiter, logOperation, upload.single('image'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name } = req.body;
        const birdIndex = birds.findIndex(bird => bird.id === id);

        if (birdIndex === -1) {
            return res.status(404).json({ error: 'Bird not found' });
        }

        const updatedBird = { ...birds[birdIndex] };

        if (name) updatedBird.name = name;
        if (req.file) {
            // 如果有新图片，删除旧图片
            if (updatedBird.imageUrl) {
                try {
                    await fs.unlink(path.join(__dirname, 'public/images', updatedBird.imageUrl));
                } catch (error) {
                    console.error('Error deleting old image:', error);
                }
            }

            updatedBird.imageUrl = req.file.filename;
        }

        birds[birdIndex] = updatedBird;
        await saveData();

        res.json({
            ...updatedBird,
            operation: res.locals.operationDesc
        });
    } catch (error) {
        console.error('Error updating bird:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 删除鸟类
app.delete('/api/birds/:id', operationRateLimiter, logOperation, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const birdIndex = birds.findIndex(bird => bird.id === id);

        if (birdIndex === -1) {
            return res.status(404).json({ error: 'Bird not found' });
        }

        const bird = birds[birdIndex];

        // 删除关联的图片
        if (bird.imageUrl) {
            try {
                await fs.unlink(path.join(__dirname, 'public/images', bird.imageUrl));
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }

        birds.splice(birdIndex, 1);
        await saveData();

        res.json({
            message: 'Bird deleted successfully',
            operation: res.locals.operationDesc
        });
    } catch (error) {
        console.error('Error deleting bird:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 启动服务器
async function startServer() {
    try {
        // 确保图片目录存在
        await fs.mkdir(path.join(__dirname, 'public/images'), { recursive: true });

        // 初始化数据
        await initData();

        // 启动服务器
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();