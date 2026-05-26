# caesar-docs:work

目标：在使用 `caesar-docs` skill 开始处理仓库任务时，先把当前工作约束到可信的知识地图、最小相关事实、影响范围和验证方式。

## 触发时机

当用户要求使用 `caesar-docs` 进行工作，或请求中没有明确限定为初始化、更新、审查，但需要依赖知识地图来理解、修改、规划、排查、记录或交付仓库任务时，使用本命令。

本命令是 `caesar-docs` 的通用开工入口。它不替代 `init`、`update`、`review`：

- 仓库没有可用知识地图，或用户明确要求创建地图时，转入 [init.md](init.md)。
- 用户明确要求同步文档、维护地图或把代码变化写回知识地图时，转入 [update.md](update.md)。
- 用户明确要求检查地图质量、找问题或给审查结论时，转入 [review.md](review.md)。
- 其他需要在知识地图约束下完成的实际工作，先执行本命令。

## 必读依据

开始前按需读取这些文件，不要展开整棵文档树：

1. 仓库入口：`AGENTS.md`、`ARCHITECTURE.md`、`README.md`，如果存在。
2. 地图入口：`docs/index.md`、`docs/map/index.md`、`docs/map/workflows.md`，选择最小相关入口。
3. 如果需要判断影响范围或开工边界，读取 `docs/workflows/impact-map.md`；如果不存在，读取 [../references/impact-map.md](../references/impact-map.md) 并用其中模板形成临时 impact map。
4. 如果工作涉及目录新增、迁移或文档同步，读取 [../references/directory-operations.md](../references/directory-operations.md)。
5. 如果工作需要快速理解代码目录、定位代码链路，或涉及 `docs/wiki/` 维护，读取 [../references/wiki.md](../references/wiki.md)。
6. 如果工作涉及链接、事实来源或验证规则，读取 [../references/link-validation.md](../references/link-validation.md)。

读到下一步已经明确时就停止。只引用实际读到的知识地图节点，不要把 skill 文档或聊天上下文伪装成仓库事实。

## 默认流程

1. 确认用户目标、交付物和仓库当前状态。
2. 查找并读取最小知识地图入口：
   ```bash
   rg --files -g 'docs/**' -g 'AGENTS.md' -g 'ARCHITECTURE.md' -g 'README.md'
   ```
3. 把任务映射到受影响的领域、工作流、参考节点和文件范围。
   - 若存在 `docs/wiki/`，优先用它作为代码目录解释和快速定位入口，再用 references/indexes 校验真实落点。
4. 对非琐碎任务形成 impact map，至少包含：
   - 目标；
   - 需要读取的知识地图节点；
   - 允许修改的文件范围；
   - 不变量和风险；
   - 最小验证方式；
   - 是否需要在完成后更新 `docs/`。
5. 只在 impact map 覆盖范围内工作。发现范围扩大时，先说明新增影响再继续。
6. 执行最小相关验证。无法验证时说明原因和残余风险。
7. 判断是否需要转入 `caesar-docs:update`：
   - 长期事实、入口、领域边界、工作流、验证命令或文件归属发生变化时，必须更新知识地图。
   - 只完成一次性探索、临时解释或无长期事实变化时，不写入 memory 或新节点。

## 输出要求

默认使用中文，简单任务可以压缩，但不要丢失关键事实：

```text
目标和约束:
命中的 KM 节点:
Impact map 或跳过理由:
执行结果:
验证证据:
知识地图更新结果:
残余风险:
```

## 不变量

- `docs/` 是长期事实入口；skill 只提供工作方法。
- 只把实际读到的 `docs/` 文件称为命中的知识地图节点。
- 优先更新已有节点，避免创建重复平行文档。
- 不把未经验证的经验写入 memory。
- 不安装未知依赖、不调用外部服务、不写仓库外路径，除非用户明确批准。
- 不覆盖用户已有未提交修改；如果相关文件已有变更，先理解并在其基础上工作。
