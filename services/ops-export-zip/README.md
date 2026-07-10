# Ops Export ZIP（函数计算打包器）

把 AutoHire 运营导出任务打成 UTF-8 ZIP，写回 OSS，并回调 AutoHire。

## 功能

1. 读取 `entriesObjectKey`（AutoHire 写好的清单 JSON）
2. 按清单从 OSS 拉文件，打 ZIP（中文路径）
3. 每个专家固定材料夹若为空，写入 `.keep`
4. 上传到 `outputObjectKey`
5. `POST callbackUrl`（`Authorization: Bearer $OPS_EXPORT_CALLBACK_SECRET`）

## 环境变量（FC 函数配置）

| 变量 | 示例 | 说明 |
|------|------|------|
| `OPS_EXPORT_CALLBACK_SECRET` | 随机串 | 与 AutoHire `.env` 相同 |
| `OSS_BUCKET` | `hirebucket` | |
| `OSS_REGION` | `cn-wuhan-lr` | 桶所在地域（可与 FC 不同） |
| `OSS_ENDPOINT` | `https://oss-cn-wuhan-lr.aliyuncs.com` | 跨地域必填公网 Endpoint |

凭证：使用函数角色注入的 `ALIBABA_CLOUD_*`，不要把 AK 写进代码。

## 本地打上传包

```bash
cd services/ops-export-zip
npm run pack
```

`pack` 会先 `npm install --omit=dev`，再打 zip（无需事先手动 install）。
若旧版脚本报找不到 `archiver`，先拉最新代码，或临时执行：

```bash
npm install --omit=dev
npm run pack
```

生成：`dist/ops-export-zip.zip`，在 FC 控制台「代码」页上传。

入口：`handler.handler`  
运行时：Node.js 18+  
建议内存：2048MB+，超时：600～1800 秒

## 调用约定

见仓库内 AutoHire `src/lib/ops-expert-files/fc-client.ts`：异步 HTTP + Bearer。

## FC 3.0 event 解析

内置运行时 HTTP 触发器传入的 `event` 是 **Buffer**（JSON 字符串），需先 `JSON.parse`，再读 `body` / `isBase64Encoded` / `headers`。  
参考官方文档：

- [Node.js 请求处理程序](https://help.aliyun.com/zh/functioncompute/fc/user-guide/request-handlers)
- [HTTP 触发器请求与响应结构](https://help.aliyun.com/zh/functioncompute/fc/user-guide/http-trigger-invoking-function)

本地单测：

```bash
# 在仓库根目录
bun run vitest run services/ops-export-zip/handler.test.mjs
```
