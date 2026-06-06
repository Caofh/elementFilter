# Element Filter

Chrome 扩展：在网页中按 CSS 选择器或关键词高亮 / 隐藏元素。

## 项目结构

```
elementFilter/
├── manifest.json
├── icons/
├── src/
│   ├── background/background.js   # Service Worker
│   ├── content/content.js         # 页面注入脚本
│   ├── content/content.css
│   └── popup/                     # 扩展弹窗 UI
└── README.md
```

## 本地加载

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目根目录 `elementFilter`

## 使用说明

1. 打开任意网页
2. 点击扩展图标
3. 输入 CSS 选择器（如 `div.ad`）或关键词
4. 选择「高亮」或「隐藏」
5. 勾选「启用过滤」并点击「应用」

## 开发说明

- 使用 Manifest V3
- 配置保存在 `chrome.storage.sync`
- 修改代码后，在 `chrome://extensions/` 点击扩展的刷新按钮即可

## 图标

请在 `icons/` 目录放置以下尺寸的 PNG 图标：

- `icon16.png`
- `icon48.png`
- `icon128.png`

若暂时没有图标，可先用任意 PNG 重命名后放入该目录。
