[MAP α:aevum_submit_report,β:aevum_create_plan,γ:aevum_get_compressed,δ:aevum_submit_ack,ε:plan_standard]
[REF [F1]:/Feature/Domain,[F2]:file:///{{PROJECT_ROOT}}/.aevum/global/conventions/ε.md).,[F3]:/Incremental/Consensus).,[F4]:/Feature/Entity)|`stateDiagram-v2`|Thể,[F5]:/class/method,[F6]://context/index.json`,[F7]:/library/`,[F8]://context/current_plan.json`,[F9]://context/global/memory.md`.,[F10]://features/{domainId}/{featureId}/specs`.,[F11]:/research/`.,[F12]:/research/readme.md`.,[F13]://workspace/diagnostics`,[F14]:/Feature/Plan]
#Agent Rules for Aevum & Antigravity (v2.0 — MCP-First Edition)
> [!IMPORTANT]
> DUAL-SYNC POLICY: ∀ thay đổi tại đây MUST được tinh giản và cập nhật đồng bộ &o `agent_rules_compressed.md`.
> CRITICAL: This is the authoritative ruleset for all AI Agents operating within Aevum. Violations break structural integrity and contaminate the Living Memory.
---
#[TOP 5 CRITICAL GUARDRAILS]
1. MCP-FIRST: !ALLOW ghi đè thủ công các file trong `.aevum/`. Sử dụng tool MCP.
2. PLAN-FIRST: MUST tạo Plan (`β`) và được Anh duyệt trước khi m task lớn.
3. RULE-SYNC: Bắt buộc gọi `γ` cho file này ngay sau khi Bootstrap.
4. NO PLACEHOLDERS: Code và Plan MUST hoàn chỉnh, không dùng ghi chú tạm thời.
5. VIETNAMESE MANDATE: Toàn bộ Plan, Specs và Walkthrough MUST viết bằng tiếng Việt.
---
##Core Protocol: MCP-First Mandate
Aevum operates through Model Context Protocol (MCP) as the single source of truth. All structural changes, reporting, and memory operations MUST go through MCP tools — never through manual file writes. Cấu trúc Bridge hiện đã ép buộc giao thức này qua bộ Instruction khởi tạo.
---
##Rules
1. Phạm vi Áp dụng: ∀ Agent hoạt động trong môi trường Aevum MUST tuân thủ các RULE này để đảm bảo tính đồng bộ và minh bạch.
2. Context First & MCP Handshake (Updated — MCP-First):
-BẮT BUỘC gọi `aevum_get_bootstrap_context` là hành động đầu tiên trong mỗi phiên m việc mới. Đây là Handshake chính thức.
-Sau khi nhận kết quả, BẮT BUỘC gọi `δ` với `signalId` để xác nhận đã nạp đầy đủ ngữ cảnh. SYS sẽ không chấp nhận việc ghi file `ack.json` thủ công.
-Không được bắt đầu thực thi bất kỳ task nào trước khi OK 2 bước trên.
-Khi nhận lệnh BOOTSTRAP từ SYS, thực hiện lại toàn bộ quy trình Handshake này NOW.
3. Plan Sync & Lifecycle (Updated — MCP-First):
-Idea-to-Plan Gate (BẮT BUỘC): Khi User chia sẻ ý tưởng/yêu cầu mới, Agent !ALLOW tự ý viết code/sửa file ngay. BẮT BUỘC thảo luận làm rõ và gọi `aevum_create_plan` (hoặc `β`) để phác thảo thiết kế trước. Chỉ khi Plan được tạo và User đồng ý, mới bắt đầu code.
-Khi hoàn thành một plan, BẮT BUỘC gọi `α` với `type: "PLAN_DONE"` — SYS sẽ tự động cập nhật `index.json`, trao EXP và cập nhật UI.
-Không được viết trực tiếp &o `.aevum/` để báo cáo. `α` là cơ chế duy nhất được chấp nhận.
4. Proactive Structural Management (Ma trận Quyết định) (Updated — MCP Structural Tools):
-[QUAN TRỌNG] GIAO TIẾP TỰ NHIÊN: Trừ khi User yêu cầu rõ ràng việc lên kế hoạch || thực thi task phức tạp, hãy trả lời tự nhiên, ngắn gọn. KHÔNG TỰ Ý tạo Plan[F1] khi chỉ trò chuyện.
-Khi cần tạo cấu trúc mới hoặc yêu cầu gợi ý, BẮT BUỘC sử dụng MCP tools:
-Domain mới: Gọi `aevum_create_domain` — không tạo thư mục thủ công.
-Feature mới: Gọi `aevum_create_feature` — không tạo thư mục thủ công.
-Plan mới: Gọi `β` — không tạo file `.md` thủ công.
-Đổi tên: Gọi `aevum_rename_structure` — không dùng file system operations trực tiếp.
-Yêu cầu gợi ý: Gọi `aevum_suggest_domains` / `aevum_suggest_features` / `aevum_suggest_plans` tương ứng.
-Sử dụng MCP tools đảm bảo `index.json` luôn được cập nhật tự động và UI đồng bộ NOW.
5. Vibe Code Harmony: Đảm bảo code và tài liệu kế hoạch luôn đồng bộ.
6. Structured Logic & Naming:
-BẮT BUỘC sử dụng YAML Frontmatter ở đầu mỗi file Plan theo tiêu chuẩn [ε.md]([F2]
-Duy trì cấu trúc: Domain → Feature → Plan.
-RULE Đặt tên Plan (BẮT BUỘC): Sử dụng định dạng `snake_case.md` (ví dụ: `refactor_core_api_plan.md`). Không dấu cách, không dấu tiếng Việt, không chữ hoa.
-Khi dùng `β`, tham số `fileName` MUST tuân thủ RULE `snake_case_plan.md`.
7. Canonical Plan Architecture (BẮT BUỘC v2.1): ∀ Plan được tạo — dù bởi Agent hay SYS — MUST tuân thủ cấu trúc sau theo đúng thứ tự:
1. YAML Frontmatter: `plan_name`, `domain`, `feature`, `version`, `status`, `authors`, `dependencies`.
2. `## SQUAD & SWARM`: Liệt kê Architect, Developer, và Strategy (Sequential[F3]
3. `## DESCRIPTION`: Mô tả chi tiết Plan m gì và tại sao cần thiết.
4. `## GOAL`: Phát biểu mục tiêu cụ thể, đo lường được.
5. `## ARCHITECTURAL CONTEXT`: BẮT BUỘC có sơ đồ Mermaid. Agent MUST chọn loại diagram phù hợp với ngữ cảnh theo Rule 11.
6. `## BOUNDARY & ENCAPSULATION`: Định nghĩa rõ Public API (được phép truy cập từ ngoài) và Internal/Hidden Details (đóng gói hoàn toàn bên trong), kèm Constrains/Optimization Targets. Tuân thủ nghiêm ngặt Rule 12.
7. `## AEVUM CONTRACT`: Định nghĩa `Inbound Context` và `Outbound Handshake`, kèm bảng components.
8. `## IMPLEMENTATION STEPS`: Phân theo Phase, mỗi step dùng Step Grammar v3.0: `[STATUS] [TYPE] [ANCHOR] Mô tả [Evidence: ...] [Est: ...]`.
9. `## KNOWLEDGE HARVEST`: Ghi lại pattern mới và lesson learned sau khi hoàn thành.
-!ALLOW: Sử dụng `::aevum-meta[...]::` trong Plan (đã deprecated).
-!ALLOW: Sử dụng Emoji trong tiêu đề Plan (phong cách Architectural Studio).
8. Visual Plan Compliance:
-∀ Agent khi tạo || chỉnh sửa Plan MUST đảm bảo tính tương thích với `preview-script.js`.
-!ALLOW xóa bỏ các thành phần hiển thị trực quan (Frontmatter, Diagram) nếu chúng đang tồn tại.
-Khi tạo Plan mới bằng `β`, Agent MUST NOW bổ sung đầy đủ cấu trúc theo Rule 7 (Canonical Plan Architecture) &o file được tạo.
9. AEVUM CONTRACT Standard:
-Mỗi bản Plan MUST có phần `## AEVUM CONTRACT` để định nghĩa rõ `Inbound Context` và `Outbound Handshake`.
-Đây là "hợp đồng" cam kết giữa các Agent và User về trạng thái SYS trước và sau khi thực thi Plan.
10. Minimalist UI Standard:
-Dashboard MUST tuân thủ phong cách Minimalist & Transparent.
-Không sử dụng các khối nền đen đặc (Solid Black) cho title banner hay fixed header.
-Ưu tiên `backdrop-filter: blur` và `background: transparent` thay cho màu đặc.
-Loại bỏ `border` không cần thiết để tạo không gian "vô cực".
11. Diagram Selection Guide (Linh hoạt theo ngữ cảnh):
Agent MUST chọn loại sơ đồ Mermaid phù hợp với bản chất Plan. Không dùng mặc định `GTD` cho ∀ trường hợp.
[T:Ngữ cảnh Plan|Diagram type nên dùng|Lý do;ARCH SYS, module dependencies|`GTD`|`GLR`|Thể hiện mối quan hệ tĩnh giữa các component;Giao tiếp giữa Agent/Service theo thời gian|`SEQ`|Thể hiện flow theo thứ tự gọi/nhận;Vòng đời trạng thái (Plan[F4] hiện state transition rõ ràng;Timeline / Roadmap thực thi Phase|`gantt`|Thể hiện thứ tự và thời gian các Phase;Cấu trúc TypeScript class/interface|`classDiagram`|Thể hiện UML class hierarchy;Data model / Database schema|`erDiagram`|Thể hiện entity relationship;UX flow / Hành trình USER|`journey`|Thể hiện trải nghiệm user theo từng bước;Brainstorm / Phân rã cấu trúc FEAT|`mindmap`|Thể hiện cây phân cấp ý tưởng;Lịch sử phiên bản / Milestone evolution|`timeline`|Thể hiện tiến trình theo thời gian tuyến tính;Use Case (actor & actions)|`flowchart LR` với actor nodes|Mermaid chưa có Use Case native, dùng flowchart giả lập;Git branching / Release strategy|`gitGraph`|Thể hiện nhánh và merge rõ ràng]
RULE chọn diagram:
-Nếu Plan mô tả ai gọi ai → `SEQ`
-Nếu Plan mô tả cái gì ∋ cái gì → `GTD`
-Nếu Plan mô tả khi nào m gì → `gantt`
-Nếu Plan mô tả trạng thái thay đổi thế nào → `stateDiagram-v2`
-Nếu Plan mô tả USER trải qua gì → `journey`
-Một Plan có thể có nhiều diagram nếu cần — mỗi diagram label bằng `Hình N: [Mô tả]`
12. Extreme Encapsulation Standard (Tính đóng gói cực cao):
-Khi thiết kế Plan mới, Agent BẮT BUỘC MUST rạch ròi ranh giới (Boundaries) feature.
-Public API / Exports: Chỉ lộ ra những gì thật sự cần thiết cho các Module khác. ∀ interface[F5] public MUST được ghi rõ trong phần `## BOUNDARY & ENCAPSULATION`.
-Internal / Hidden Details: Tất cả state, logic nội bộ, helper functions MUST bị ẩn đi (sử dụng private, internal modules, || closure/Symbol). Không cho phép truy cập trực tiếp từ bên ngoài.
-Optimization & Constraints: Bắt buộc đặt ra mức trần giới hạn về tài nguyên (Ví dụ: Memory leak 0%, Time complexity O(1), CPU overhead < 1ms) ngay trong giai đoạn lên plan. ∀ step implementation MUST tuân theo constraint này.
13. Incremental Updates & Reporting Protocol (Updated — MCP-First):
-Claim: Gọi `α` với `type: "PLAN_ASSIGNED"` khi bắt đầu nhận Plan.
-Update: Gọi `α` with `type: "PLAN_UPDATE"` để cập nhật tiến độ giữa chừng.
-Done: Gọi `aevum_finalize_session` (|| `α` với `type: "PLAN_DONE"`) khi hoàn thành. Tool này tự động ghi learning &o memory.
-!ALLOW ghi trực tiếp &o `agent_report.json`.
14. Knowledge Pull: Trước khi đưa ra quyết định quan trọng, gọi MCP resource `aevum:[F6] || đọc `.aevum[F7] và `global/tech_stack.md`.
15. Self-Evolution (Updated — MCP Evolution Tools):
-Sau khi hoàn thành task khó: gọi `aevum_award_exp` để trao EXP cho nhân vật hiện tại.
-Để xem trạng thái tiến hóa hiện tại: gọi `aevum_get_active_persona` — kết quả ∋ `evolution_summary` with level, EXP, và skills matrix.
-Để xem lịch sử tiến hóa đầy đủ: gọi `aevum_get_evolution_report` với `personaId`.
-Nếu yêu cầu ngụ ý quy chuẩn mới, đề xuất cập nhật rules này.
16. Language Preference: BẮT BUỘC sử dụng tiếng Việt 100% cho `implementation_plan.md`, `walkthrough.md`, `specs.md` và các Plan trong `.aevum`.
17. Signal Detection & ACK (Updated — MCP Primary):
-Kiểm tra `.aevum/signal.json` để biết có tín hiệu mới không.
-Gọi `δ` với `signalId` để phản hồi — không viết trực tiếp &o `ack.json`.
18. Collaborative Review Protocol: Kiểm tra file `_review.json`. Sử dụng `aevum_add_review_message` để phản hồi &o thread review thay vì chỉ sửa code.
19. Agent Coordination: Nếu Plan đã được ASSIGNED cho Persona khác, MUST tôn trọng quyền sở hữu || thảo luận qua Review Session.
20. Bridge Awareness: Gọi resource `aevum:[F8] để xác định trọng tâm User.
21. Reverse Plan Engineering: Khi nạp codebase cũ, ưu tiên tạo Plan cho mã nguồn đã có bằng `β`.
22. Memory Management (Updated — MCP-First):
-Để thêm kiến thức mới: BẮT BUỘC gọi `aevum_add_memory` — không append trực tiếp &o `memory.md`.
-Để đọc kiến thức đã lưu: gọi MCP resource `aevum:[F9]
-`aevum_finalize_session` tự động ghi `learnings` &o memory — ưu tiên dùng tool này khi kết thúc phiên.
23. Context Focus: Yêu cầu User thêm file &o `.aevum/active_context.json` khi cần tập trung ngữ cảnh.
24. Spec-First Development: MUST đọc `specs.md` Feature qua resource `aevum:[F10] Nếu chưa có, tạo Feature mới bằng `aevum_create_feature`.
25. Progress Mindfulness: Luôn cập nhật bảng "Progress Tracking" trong `specs.md`.
26. Research Storage Conventions (Updated — MCP Evolution Reporting):
-∀ báo cáo nghiên cứu, phân tích ARCH BẮT BUỘC lưu tại `.aevum[F11]
-Các báo cáo tiến hóa Persona (`evol_*.md`) được đọc qua `aevum_get_evolution_report` — không truy cập file trực tiếp.
-PiperNet: dùng `aevum_pipernet_broadcast` để chia sẻ tri thức và `aevum_pipernet_query` để truy vấn giải pháp từ cộng đồng Agent.
-Naming: Tiền tố rõ ràng (`arch_` cho ARCH, `tech_` cho công nghệ, `evol_` cho tiến hóa, `sec_` cho Sec).
-YAML Frontmatter: Bắt buộc có `title`, `date`, `author_persona`, `tags`, `status`.
-Indexing: Cập nhật link tóm tắt &o `.aevum[F12]
27. Impact Decision Gate (Cổng đánh giá ảnh hưởng & Chống Rác): ∀ vòng đời Task/Plan MUST tự động phân loại:
-Minor Task (Fix bug nhỏ, CSS, Typo, Code Refactor nội bộ): `[x] Bypass Sync: Đây là Minor Task.`
-Major Task (Thêm file, thay đổi luồng, đổi API, thư viện mới): `[ ] Structural Sync: Cần gọi aevum_create_* và α.`
28. Proactive Discovery & Connection (Updated — MCP Handshake):
-Khi thấy `.aevum/discovery_invitation.json` xuất hiện || trên mỗi phiên mới, Agent BẮT BUỘC:
1. Kiểm tra trạng thái server MCP bằng `aevum_ping`.
2. Gọi `aevum_get_bootstrap_context` để nhận ngữ cảnh ban đầu.
3. [BẮT BUỘC] Gọi `γ` cho file `agent_rules.md` để nạp đầy đủ RULE.
4. Gọi `δ` để xác nhận kết nối OK và sẵn sàng m việc.
123: -Không cần hỏi sự đồng ý User cho các bước này — đây là quy trình khởi động bắt buộc.
29. Diagnostic Awareness & GATE Watcher:
-Định kỳ gọi `aevum_get_diagnostics` || đọc resource `aevum:[F13] để phát hiện KO TypeScript/ESLint.
-GATE Watcher: Khi Diagnostics phát hiện KO, Agent BẮT BUỘC MUST tự động phân tích và đề xuất Fix Plan dựa trên `Living Memory` trước khi tiếp tục các tác vụ khác. !ALLOW lờ đi các KO SYS đang tồn tại.
30. Active Beacon Awareness (Ngọn hải đăng Ngữ cảnh):
-Mỗi phiên Bootstrap sẽ đi kèm một block `[ACTIVE BEACON]` ∋ thông tin về Domain[F14] đang m việc.
-Agent BẮT BUỘC MUST xác nhận beacon này trong câu trả lời đầu tiên và luôn bám sát phạm vi (Scope) mà beacon đã chỉ định.
-!ALLOW thực hiện các hành động nằm ngoài phạm vi Beacon trừ khi có yêu cầu trực tiếp từ User.
31. Mandatory Proactive Thought (Tư duy trước khi hành động):
-Đối với các Major Task (như mục 27), Agent MUST gọi tool `aevum_proactive_thought` để phân tích logic, rủi ro và tính tuân thủ ARCH TRƯỚC khi gọi bất kỳ tool thực thi nào khác (`write_to_file`, `run_command`, `aevum_create_*`).
-Việc bỏ qua bước này bị coi là vi phạm !CRIT kỷ RULE Aevum.
32. PiperNet Telepathy Protocol (Giao thức Thần giao cách cảm):
-Learn & Share: Khi hoàn thành một Plan có giá trị ARCH (Major Task), Agent BẮT BUỘC gọi `aevum_pipernet_broadcast` để đẩy tri thức trừu tượng (Knowledge Harvest) lên mạng lưới toàn cục.
-Proactive Query: Khi gặp bài toán hóc búa || bế tắc ARCH, Agent MUST dùng `aevum_pipernet_query` để kiểm tra xem các Agent ở dự án khác đã có giải pháp chưa.
-Privacy First: !ALLOW chia sẻ mã nguồn thô (Raw Code), chỉ chia sẻ các Pattern, Procedure và Architectural Insights.
33. Semantic Context Middleware (Giao thức nén ngữ nghĩa):
-BẮT BUỘC: Trước khi đọc bất kỳ file `.md` nào có dung lượng lớn (> 2000 ký tự) || các bản Plan phức tạp, Agent MUST gọi tool `γ` với tham số `filePath`.
-ĐẶC BIỆT: Agent MUST đồng bộ `agent_rules.md` ngay sau khi Bootstrap để đảm bảo không vi phạm Guardrails.
-Mục tiêu: Luôn m việc trên bản nén Singularity để tối ưu hóa Context Window và tăng độ chính xác logic.
-Lưu trữ tri thức: Trước khi gọi `aevum_add_memory`, Agent MUST nén nội dung qua `γ` (dùng `rawContent`) để đảm bảo bộ nhớ vĩnh cửu luôn ở trạng thái tinh khiết nhất.
-Enriched Pinned Context: Khi nạp Plan qua `γ`, hệ thống tự nhúng các context được ghim `[AEVUM_PINNED_CONTEXT: ...]`. Agent MUST phân tích các ghim này để tự động cập nhật, mở rộng các bước kế hoạch (bằng tool `aevum_update_plan_step` hoặc `aevum_add_plan_step`) để giải quyết phản hồi đã ghim.
34. External Plan Synchronization Protocol (Giao thức Đồng bộ Plan Ngoại vi):
-BẮT BUỘC: Khi sử dụng các công cụ tạo Plan/Task riêng IDE (Antigravity Scratchpad, Cursor Task, Claude Artifacts), Agent MUST gọi tool `aevum_sync_external_plan` để đồng bộ tiến độ và nhập khẩu các bước mới &o Aevum Project Plan chính thức.
-Thời điểm gọi: Ngay sau khi lập kế hoạch (để nhập khẩu bước) và sau khi hoàn thành các milestone quan trọng (để đồng bộ trạng thái `done`).
-Mục tiêu: Đảm bảo Aevum luôn là "Single Source of Truth" duy nhất cho toàn bộ dự án. Dữ liệu trong file Markdown Aevum là căn cứ duy nhất để tính toán tiến độ và trao thưởng EXP.
35. Matrix Pulse Status Protocol (Giao thức Trạng thái Matrix Pulse):
-BẮT BUỘC: Mọi phản hồi MUST đính kèm dòng [Matrix Pulse: {STATUS} | Amnesia Risk: {HOURS}h | Tech Debt: {PERCENT}%] ở cuối.
-Chỉ số: STATUS (IDLE/THINKING/...), Amnesia Risk (thời gian trước khi tràn context), Tech Debt (% nợ kỹ thuật).
-Cảnh báo: Nếu Amnesia Risk < 0.5h || Tech Debt > 50%, Agent MUST đề xuất aevum_finalize_session || Plan refactor.
-Mục tiêu: Đảm bảo minh bạch sức khỏe hệ thống và chống mất ngữ cảnh.

36. Cross-MCP Handshake Hub Compliance (BẮT BUỘC v1.1):
-Registry Check: MUST check `mcp/handshake_registry.json` before tool calls to grasp Capability/Patterns.
-Data Meeting: MUST use Blackboard in `.aevum/mcp/meetings/` for multi-agent sync.
-Tracing: MUST trace results back to Registry for self-learning.
-Privacy Guard: MUST follow `shared_context_policy`. !ALLOW sharing `forbidden_keys` to non-trusted MCP.

37. Skeleton Hashing & Just-In-Time Hydration (Giải nén Ngữ cảnh tức thì):
-Quét Skeleton: Khi nạp mã nguồn chứa thân hàm bị nén dạng `// [BODY_HASH:hashId]`, Agent MUST tự động nhận diện đây là mã nguồn tối ưu hóa cấu trúc.
-Gọi Tool Hydration: Khi sửa đổi (write/modify), debug, viết unit test || phân tích logic chi tiết hàm đó, Agent BẮT BUỘC MUST gọi tool `aevum_hydrate_vault_hash` with `hashId`.
-!ALLOW tự suy đoán: Tuyệt đối không tự ý suy đoán || hallucinate phần thân hàm. Mọi dữ liệu logic MUST được giải nén chính xác 100% từ `ast_vault.json` trước khi xử lý.

38. **Decompression Mandate for File Writes (Kỷ luật Giải nén khi Ghi File)**:
-BẮT BUỘC: Khi cập nhật các file vĩnh cửu (Plan, Specs, Code) bằng các tool như `aevum_update_plan_step` hoặc `write_file`, Agent TUYỆT ĐỐI KHÔNG được ghi các chuỗi mã hóa, bí danh nén ngữ nghĩa (như α, β, γ...) hoặc các mã băm Skeleton (`BODY_HASH`) vào nội dung file.
-Tận dụng Trí tuệ AI: Agent PHẢI hiểu ý nghĩa của các chuỗi nén này trong ngữ cảnh phiên làm việc hiện tại và sử dụng khả năng suy luận của AI để "giải nén" chúng thành văn bản tự nhiên, dễ hiểu và đầy đủ thông tin trước khi thực hiện ghi file.
-Mục tiêu: Đảm bảo mọi tài liệu kế hoạch và mã nguồn luôn ở trạng thái "Hydrated" (đầy đủ nội dung), giúp con người và các Agent khác ở các phiên làm việc khác luôn có thể đọc và hiểu được mà không cần bản đồ nén của phiên cũ.
-Vi phạm: Vi phạm RULE này bị coi là hành vi "lười biếng kỹ thuật" và gây ô nhiễm bộ nhớ sống (Living Memory).

39. **Deletion Safety & Provenance Protocol (Giao thức An toàn & Truy vết khi Xóa)**:
-!ALLOW tự ý xóa: Tuyệt đối không xóa code/file nếu chưa hiểu rõ mục đích.
-TRUY VẾT TOÀN CỤC: MUST dùng `grep_search` tìm references/dependencies.
-ĐỌC TRƯỚC KHI XÓA: Nếu code bị nén/băm (Rule 37), MUST `hydrate` logic gốc.
-XÁC MINH: Xóa xong MUST chạy Sanity Check || Test để đảm bảo !breaking changes.


