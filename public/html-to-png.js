/**
 * 将 HTML 元素转换为 PNG 图像（支持导出时显示特定元素）
 * @param {HTMLElement} element - 要转换的 HTML 元素
 * @param {Object} options - 转换选项
 * @param {number} options.scale - 缩放比例，默认 2
 * @param {string} options.backgroundColor - 背景颜色，默认白色
 * @param {boolean} options.useCORS - 是否尝试跨域资源加载，默认 true
 * @param {Array} options.excludeClasses - 要排除的CSS类，默认 ['no-export']
 * @param {Array} options.exportOnlyClasses - 仅在导出时显示的CSS类，默认 ['.export-only']
 * @param {Array} options.screenOnlyClasses - 仅在屏幕显示时的CSS类，默认 ['.screen-only']
 * @returns {Promise<string>} - 返回包含 PNG 数据的 DataURL
 */
async function convertHtmlToPng(element, options = {}) {
    // 设置默认选项
    const {
        scale = 1,
        backgroundColor = '#ffffff',
        useCORS = true,
        excludeClasses = ['no-export'],
        exportOnlyClasses = ['.export-only'],
        screenOnlyClasses = ['.screen-only']
    } = options;

    // 显示加载状态
    showLoading(true);

    try {
        // 使用 onclone 回调在克隆DOM时处理元素显示状态
        const canvas = await html2canvas(element, {
            scale,
            backgroundColor,
            useCORS,
            logging: false,
            onclone: (clonedDoc) => {
                // 1. 移除所有需要排除的元素
                excludeClasses.forEach(className => {
                    const elements = clonedDoc.querySelectorAll(`.${className}`);
                    elements.forEach(el => el.remove());
                });

                // 2. 强制显示仅导出时可见的元素
                exportOnlyClasses.forEach(selector => {
                    const elements = clonedDoc.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'block !important';
                    });
                });

                // 3. 强制隐藏仅屏幕显示的元素
                screenOnlyClasses.forEach(selector => {
                    const elements = clonedDoc.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'none !important';
                    });
                });

                // 4. 示例：可额外移除特定元素（如页脚）
                const footer = clonedDoc.querySelector('footer');
                if (footer) footer.remove();
            }
        });

        return canvas.toDataURL('image/png', 0.9);
    } catch (error) {
        console.error('HTML 转 PNG 失败:', error);
        throw new Error('转换过程中发生错误，请重试');
    } finally {
        showLoading(false);
    }
}

/**
 * 下载 PNG 图像
 * @param {string} dataUrl - 图像数据 URL
 * @param {string} filename - 下载的文件名，默认 'screenshot.png'
 */
function downloadPng(dataUrl, filename = 'screenshot.png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 将 HTML 元素转换为 JPG 图像（支持导出时显示特定元素）
 * @param {HTMLElement} element - 要转换的 HTML 元素
 * @param {Object} options - 转换选项
 * @param {number} options.scale - 缩放比例，默认 2
 * @param {string} options.backgroundColor - 背景颜色，默认白色
 * @param {boolean} options.useCORS - 是否尝试跨域资源加载，默认 true
 * @param {Array} options.excludeClasses - 要排除的CSS类，默认 ['no-export']
 * @param {Array} options.exportOnlyClasses - 仅在导出时显示的CSS类，默认 ['.export-only']
 * @param {Array} options.screenOnlyClasses - 仅在屏幕显示时的CSS类，默认 ['.screen-only']
 * @returns {Promise<string>} - 返回包含 JPG 数据的 DataURL
 */
async function convertHtmlToJpg(element, options = {}) {
    // 设置默认选项
    const {
        scale = 1,
        backgroundColor = '#ffffff',
        useCORS = true,
        excludeClasses = ['no-export'],
        exportOnlyClasses = ['.export-only'],
        screenOnlyClasses = ['.screen-only']
    } = options;

    // 显示加载状态
    showLoading(true);

    try {
        // 使用 onclone 回调在克隆DOM时处理元素显示状态
        const canvas = await html2canvas(element, {
            scale,
            backgroundColor,
            useCORS,
            logging: false,
            onclone: (clonedDoc) => {
                // 1. 移除所有需要排除的元素
                excludeClasses.forEach(className => {
                    const elements = clonedDoc.querySelectorAll(`.${className}`);
                    elements.forEach(el => el.remove());
                });

                // 2. 强制显示仅导出时可见的元素
                exportOnlyClasses.forEach(selector => {
                    const elements = clonedDoc.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'block !important';
                    });
                });

                // 3. 强制隐藏仅屏幕显示的元素
                screenOnlyClasses.forEach(selector => {
                    const elements = clonedDoc.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'none !important';
                    });
                });

                // 4. 示例：可额外移除特定元素（如页脚）
                const footer = clonedDoc.querySelector('footer');
                if (footer) footer.remove();
            }
        });

        // 修改为 JPG 格式，质量设为 0.9
        return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
        console.error('HTML 转 JPG 失败:', error);
        throw new Error('转换过程中发生错误，请重试');
    } finally {
        showLoading(false);
    }
}

/**
 * 下载 JPG 图像
 * @param {string} dataUrl - 图像数据 URL
 * @param {string} filename - 下载的文件名，默认 'screenshot.jpg'
 */
function downloadJpg(dataUrl, filename = 'screenshot.jpg') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 显示或隐藏加载状态
 * @param {boolean} isLoading - 是否处于加载状态
 */
function showLoading(isLoading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
}

/**
 * 显示通知消息
 * @param {string} message - 通知消息内容
 * @param {string} type - 通知类型，可选 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    // 设置通知类型样式
    notification.className = 'fixed bottom-4 right-4 px-4 py-2 border-2 p-4 transform transition-all duration-500 translate-y-20 opacity-0 z-50';
    notification.classList.add('text-white');

    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'border-green-700');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'border-red-700');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-500', 'border-blue-700');
            break;
    }

    // 设置通知内容
    notification.textContent = message;

    // 显示通知
    setTimeout(() => {
        notification.classList.remove('translate-y-20', 'opacity-0');
    }, 10);

    // 自动隐藏通知
    setTimeout(() => {
        notification.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// 初始化页面事件
document.addEventListener('DOMContentLoaded', function() {
    // 关于模态框相关事件（保持不变）
    const aboutBtn = document.getElementById('about-btn');
    const closeAboutModal = document.getElementById('close-about-modal');
    const closeAboutBtn = document.getElementById('close-about-btn');
    const aboutModal = document.getElementById('about-modal');
    const aboutModalContent = document.getElementById('about-modal-content');

    if (aboutBtn && aboutModal && aboutModalContent) {
        aboutBtn.addEventListener('click', function() {
            aboutModal.classList.remove('hidden');
            setTimeout(() => {
                aboutModalContent.classList.remove('scale-95', 'opacity-0');
                aboutModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        });

        function closeModal() {
            aboutModalContent.classList.remove('scale-100', 'opacity-100');
            aboutModalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                aboutModal.classList.add('hidden');
            }, 300);
        }

        if (closeAboutModal) closeAboutModal.addEventListener('click', closeModal);
        if (closeAboutBtn) closeAboutBtn.addEventListener('click', closeModal);

        // 点击模态框外部关闭
        aboutModal.addEventListener('click', function(e) {
            if (e.target === aboutModal) {
                closeModal();
            }
        });
    }

    // 导出图片按钮事件（新增导出时元素控制）
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function() {
            try {
                // 获取要导出的区域（示例：导出ID为bird-gallery的元素）
                let elementToExport = document.getElementById('bird-gallery-export');
                if (!elementToExport) {
                    // 无指定区域时导出整个body
                    elementToExport = document.body;
                }

                // 生成动态文件名
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const fileName = `夜鹭页录_v${year}.${month}.${day}_${hours}${minutes}`;

                // 执行导出，传入自定义选项
                const dataUrl = await convertHtmlToJpg(elementToExport, {
                    excludeClasses: ['no-export', 'footer', 'header'],
                    exportOnlyClasses: ['.export-only'],  // 仅导出时显示的类
                    screenOnlyClasses: ['.screen-only']   // 仅屏幕显示的类
                });

                downloadPng(dataUrl, `${fileName}.jpg`);
                showNotification('图片导出成功！', 'success');
            } catch (error) {
                showNotification('导出失败: ' + error.message, 'error');
            }
        });
    }
});