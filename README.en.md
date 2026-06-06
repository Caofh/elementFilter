**Language / 语言**: [中文](./README.md) | **English**

---

# Element Filter

A Chrome extension to highlight or hide elements on web pages using CSS selectors or keywords.

## Official Site

- [Official website](https://tpdoc.cn/resource/elementFilter/updatePackage/docs/index.html)

## Project Structure

```
elementFilter/
├── manifest.json
├── icons/
├── src/
│   ├── background/background.js   # Service Worker
│   ├── content/content.js         # Content script
│   ├── content/content.css
│   └── popup/                     # Extension popup UI
└── README.md
```

## Load Locally

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the project root directory `elementFilter`

## Usage

1. Open any web page
2. Click the extension icon
3. Enter a CSS selector (e.g. `div.ad`) or a keyword
4. Choose **Highlight** or **Hide**
5. Check **Enable filter** and click **Apply**

## Development

- Built with Manifest V3
- Settings are stored in `chrome.storage.sync`
- After code changes, click the refresh button on `chrome://extensions/`

## Icons

Place PNG icons in the `icons/` directory with the following sizes:

- `icon16.png`
- `icon48.png`
- `icon128.png`

If you don't have icons yet, you can use any PNG files renamed accordingly.

## License

[MIT](./LICENSE)
