#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH =
  process.env.CFH_CONFIG_PATH ||
  path.join(process.env.HOME, "UWORK-PLUS/dataSql/dataSnippet.json");
const CONFIG_KEY = "CFH-CONFIG";
const REMOTE_PATH = "/data/resource/elementFilter";

function readDeployConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`配置文件不存在: ${CONFIG_PATH}`);
  }

  const snippets = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const entry = snippets.find((item) => item.article_name === CONFIG_KEY);

  if (!entry) {
    throw new Error(`未找到 ${CONFIG_KEY} 配置项`);
  }

  const content = JSON.parse(entry.article_content);
  const { aliIp, EcsPassword: password } = content;

  if (!aliIp) {
    throw new Error(`${CONFIG_KEY} 中缺少 aliIp`);
  }

  if (!password) {
    throw new Error(`${CONFIG_KEY} 中缺少 EcsPassword`);
  }

  return { aliIp, password };
}

function run(command) {
  execSync(command, { stdio: "inherit", cwd: ROOT });
}

function scpDeploy(aliIp, password) {
  const result = spawnSync("expect", [path.join(__dirname, "scp-upload.exp")], {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      SCP_PASSWORD: password,
      SCP_LOCAL: "updatePackage",
      SCP_REMOTE: `root@${aliIp}:${REMOTE_PATH}`,
    },
  });

  if (result.status !== 0) {
    throw new Error("SCP 部署失败");
  }
}

try {
  const { aliIp, password } = readDeployConfig();
  console.log(`部署目标: root@${aliIp}:${REMOTE_PATH}`);

  run("npm run pack");
  scpDeploy(aliIp, password);

  console.log("部署完成");
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
