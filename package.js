const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取 manifest.json 获取版本号
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
const name = manifest.name.replace(/\s+/g, '-').toLowerCase();

// 输出文件名
const outputName = `${name}-v${version}.zip`;
const outputPath = path.join('releases', outputName);

// 确保 releases 目录存在
if (!fs.existsSync('releases')) {
    fs.mkdirSync('releases');
}

// 需要包含的文件和目录
const includeItems = [
    'manifest.json',
    'icons/',
    'src/',
    'dist/',
    'LICENSE',
    'README.md',
    'README_CN.md'
];

console.log('📦 开始打包扩展...');
console.log(`📌 版本: ${version}`);
console.log(`📌 输出: ${outputPath}`);

try {
    // 先运行构建脚本
    console.log('\n🔨 运行构建脚本...');
    execSync('npm run build', { stdio: 'inherit' });

    // 使用 PowerShell 创建 ZIP 文件
    console.log('\n📦 创建 ZIP 包...');

    // 删除旧的 ZIP 文件（如果存在）
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
        console.log('🗑️  删除旧的 ZIP 文件');
    }

    // 创建临时目录
    const tempDir = path.join('temp-package');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir);

    // 复制需要的文件到临时目录
    const copyRecursive = (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            const files = fs.readdirSync(src);
            files.forEach(file => {
                copyRecursive(path.join(src, file), path.join(dest, file));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    };

    includeItems.forEach(item => {
        const itemPath = item.endsWith('/') ? item.slice(0, -1) : item;
        if (fs.existsSync(itemPath)) {
            const destPath = path.join(tempDir, itemPath);
            console.log(`📁 复制: ${itemPath}`);
            copyRecursive(itemPath, destPath);
        }
    });

    // 使用 PowerShell 压缩文件
    const psCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${outputPath}" -Force`;
    execSync(psCommand, { shell: 'powershell.exe' });

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true });

    const stats = fs.statSync(outputPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    console.log('\n✅ 打包成功!');
    console.log(`📦 文件: ${outputPath}`);
    console.log(`📊 大小: ${fileSizeInKB} KB`);
    console.log('\n🚀 现在你可以：');
    console.log('   1. 将此 ZIP 文件上传到 Chrome Web Store');
    console.log('   2. 在 GitHub 上创建 Release 并附加此文件');
    console.log('   3. 分享给用户进行手动安装 (开发者模式)');

} catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
}
