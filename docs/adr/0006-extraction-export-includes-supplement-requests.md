# Extraction Export 含最新补件需求表

Status: accepted

`抽取结果.xlsx`（Extraction Export）除简历抽取主表外，固定附带 `supplement_requests` sheet，快照该申报全部 `isLatest` 补件需求（含已满足）。Material Review Run 进入 COMPLETED 后触发重算。不另建独立需求清单文件，也不在运营 ZIP 里单独拼装，避免同名导出与 OSS 落盘语义分叉。

## Considered Options

- **独立需求清单 xlsx**：运营路径分叉，被否。
- **仅 ZIP 导出时临时拼入**：与落盘 `抽取结果.xlsx` 不一致，被否。
- **塞进 `extraction` 单行 JSON**：一对多难用，被否。

## Consequences

- 工作簿始终含第二张 sheet；无需求时仅表头。
- `ApplicationExtractionExportTrigger` 增加 `MATERIAL_REVIEW`。
- 列用枚举原值；建议材料单格拼接。
