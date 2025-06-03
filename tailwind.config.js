/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./public/**/*.html",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#111111',
                secondary: '#303030',
                neutral: '#e5e7eb',
                dark: '#212529'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        }
    },
    plugins: [],
    corePlugins: {
        preflight: true, // 确保包含基础样式
    },
    future: {
        hoverOnlyWhenSupported: true, // 仅在支持hover的设备上应用hover效果
    }
}