# Agent Rules for Aevum & Antigravity (v2.0 — MCP-First Edition)
> [!IMPORTANT]
> **DUAL-SYNC POLICY**: Mọi thay đổi tại đây BẮT BUỘC phải được tinh giản và cập nhật đồng bộ vào `agent_rules_compressed.md`.

> **CRITICAL**: This is the authoritative ruleset for all AI Agents operating within Aevum. Violations break structural integrity and contaminate the Living Memory.

---
# [TOP 5 CRITICAL GUARDRAILS]
1. **MCP-FIRST**: Tuyệt đối không ghi đè thủ công các file trong `.aevum/`. Sử dụng tool MCP.
2. **PLAN-FIRST**: Phải tạo Plan (`aevum_create_plan`) và được Anh duyệt trước khi làm task lớn.
3. **RULE-SYNC**: Bắt buộc gọi `aevum_get_compressed` cho file này ngay sau khi Bootstrap.
4. **NO PLACEHOLDERS**: Code và Plan phải hoàn chỉnh, không dùng ghi chú tạm thời.
5. **VIETNAMESE MANDATE**: Toàn bộ Plan, Specs và Walkthrough phải viết bằng tiếng Việt.
---

## Core Protocol: MCP-First Mandate

Aevum operates through **Model Context Protocol (MCP)** as the single source of truth. All structural changes, reporting, and memory operations **MUST** go through MCP tools — **never through manual file writes**. Cấu trúc Bridge hiện đã ép buộc giao thức này qua bộ Instruction khởi tạo.

---

## Rules

1. **Phạm vi Áp dụng**: Mọi Agent hoạt động trong môi trường Aevum PHẢI tuân thủ các quy tắc này để đảm bảo tính đồng bộ và minh bạch.

2. **Context First & MCP Handshake** *(Updated — MCP-First)*:
    - **BẮT BUỘC** gọi `aevum_get_bootstrap_context` là hành động đầu tiên trong mỗi phiên làm việc mới. Đây là Handshake chính thức.
    - Sau khi nhận kết quả, **BẮT BUỘC** gọi `aevum_submit_ack` với `signalId` để xác nhận đã nạp đầy đủ ngữ cảnh. Hệ thống sẽ không chấp nhận việc ghi file `ack.json` thủ công.
    - Không được bắt đầu thực thi bất kỳ task nào trước khi hoàn tất 2 bước trên.
    - Khi nhận lệnh **BOOTSTRAP** từ hệ thống, thực hiện lại toàn bộ quy trình Handshake này ngay lập tức.

3. **Plan Sync & Lifecycle** *(Updated — MCP-First)*:
    - **Ý tưởng & Thiết kế (Idea-to-Plan Gate - BẮT BUỘC)**: Khi User chia sẻ ý tưởng, giải pháp hoặc yêu cầu tính năng mới: Agent **TUYỆT ĐỐI KHÔNG** được tự ý viết code hoặc sửa đổi codebase ngay lập tức. Agent phải thảo luận để làm rõ yêu cầu, sau đó sử dụng tool `aevum_create_plan` để phác thảo các bước thiết kế và thực thi trước. Chỉ khi tệp Plan được tạo và User đồng ý triển khai, Agent mới bắt đầu thực hiện các tác vụ sửa đổi code.
    - Khi hoàn thành một plan, **BẮT BUỘC** gọi `aevum_submit_report` with `type: "PLAN_DONE"` — hệ thống sẽ tự động cập nhật `index.json`, trao EXP và cập nhật UI.
    - Không được viết trực tiếp vào `.aevum/` để báo cáo. `aevum_submit_report` là cơ chế duy nhất được chấp nhận.

4. **Proactive Structural Management (Ma trận Quyết định)** *(Updated — MCP Structural Tools)*:
    - **[QUAN TRỌNG] GIAO TIẾP TỰ NHIÊN**: Trừ khi User yêu cầu rõ ràng việc lên kế hoạch hoặc thực thi task phức tạp, hãy trả lời tự nhiên, ngắn gọn. **KHÔNG TỰ Ý** tạo Plan/Feature/Domain khi chỉ trò chuyện.
    - Khi cần tạo cấu trúc mới hoặc yêu cầu hệ thống gợi ý, **BẮT BUỘC** sử dụng MCP tools:
        - **Domain mới**: Gọi `aevum_create_domain` — không tạo thư mục thủ công.
        - **Feature mới**: Gọi `aevum_create_feature` — không tạo thư mục thủ công.
        - **Plan mới**: Gọi `aevum_create_plan` — không tạo file `.md` thủ công.
        - **Đổi tên**: Gọi `aevum_rename_structure` — không dùng file system operations trực tiếp.
        - **Yêu cầu gợi ý**: Khi User yêu cầu hệ thống đề xuất/gợi ý Domain, Feature hoặc Plan, hãy gọi các MCP tools tương ứng:
            - `aevum_suggest_domains` để gợi ý các Domain mới.
            - `aevum_suggest_features` để gợi ý các Feature mới cho một Domain.
            - `aevum_suggest_plans` để gợi ý các Plan tiếp theo cho Domain/Feature.
    - Sử dụng MCP tools đảm bảo `index.json` luôn được cập nhật tự động và UI đồng bộ ngay lập tức.

5. **Vibe Code Harmony**: Đảm bảo code và tài liệu kế hoạch luôn đồng bộ.

6. **Structured Logic & Naming**:
    - **BẮT BUỘC** sử dụng **YAML Frontmatter** ở đầu mỗi file Plan theo tiêu chuẩn [plan_standard.md](file:///{{PROJECT_ROOT}}/.aevum/global/conventions/plan_standard.md).
    - Duy trì cấu trúc: **Domain → Feature → Plan**.
    - **Quy tắc Đặt tên Plan (BẮT BUỘC)**: Sử dụng định dạng `snake_case.md` (ví dụ: `refactor_core_api_plan.md`). Không dấu cách, không dấu tiếng Việt, không chữ hoa.
    - Khi dùng `aevum_create_plan`, tham số `fileName` phải tuân thủ quy tắc `snake_case_plan.md`.

7. **Canonical Plan Architecture (BẮT BUỘC v2.1)**: Mọi Plan được tạo — dù bởi Agent hay hệ thống — PHẢI tuân thủ cấu trúc sau theo đúng thứ tự:
    1. **YAML Frontmatter**: `plan_name`, `domain`, `feature`, `version`, `status`, `authors`, `dependencies`.
    2. **`## SQUAD & SWARM`**: Liệt kê Architect, Developer, và Strategy (Sequential/Incremental/Consensus).
    3. **`## DESCRIPTION`**: Mô tả chi tiết Plan làm gì và tại sao cần thiết.
    4. **`## GOAL`**: Phát biểu mục tiêu cụ thể, đo lường được.
    5. **`## ARCHITECTURAL CONTEXT`**: BẮT BUỘC có sơ đồ Mermaid. Agent PHẢI chọn loại diagram phù hợp với ngữ cảnh theo Rule 11.
    6. **`## BOUNDARY & ENCAPSULATION`**: Định nghĩa rõ Public API (được phép truy cập từ ngoài) và Internal/Hidden Details (đóng gói hoàn toàn bên trong), kèm Constrains/Optimization Targets. Tuân thủ nghiêm ngặt Rule 12.
    7. **`## AEVUM CONTRACT`**: Định nghĩa `Inbound Context` và `Outbound Handshake`, kèm bảng components.
    8. **`## IMPLEMENTATION STEPS`**: Phân theo Phase, mỗi step dùng Step Grammar v3.0: `[STATUS] [TYPE] [ANCHOR] Mô tả [Evidence: ...] [Est: ...]`.
    9. **`## KNOWLEDGE HARVEST`**: Ghi lại pattern mới và lesson learned sau khi hoàn thành.
    - **NGHIÊM CẤM**: Sử dụng `::aevum-meta[...]::` trong Plan (đã deprecated).
    - **NGHIÊM CẤM**: Sử dụng Emoji trong tiêu đề Plan (phong cách Architectural Studio).

8. **Visual Plan Compliance**:
    - Mọi Agent khi tạo hoặc chỉnh sửa Plan **PHẢI** đảm bảo tính tương thích với `preview-script.js`.
    - Tuyệt đối không xóa bỏ các thành phần hiển thị trực quan (Frontmatter, Diagram) nếu chúng đang tồn tại.
    - Khi tạo Plan mới bằng `aevum_create_plan`, Agent phải ngay lập tức bổ sung đầy đủ cấu trúc theo Rule 7 (Canonical Plan Architecture) vào file được tạo.

9. **AEVUM CONTRACT Standard**:
    - Mỗi bản Plan PHẢI có phần `## AEVUM CONTRACT` để định nghĩa rõ `Inbound Context` và `Outbound Handshake`.
    - Đây là "hợp đồng" cam kết giữa các Agent và User về trạng thái hệ thống trước và sau khi thực thi Plan.

10. **Minimalist UI Standard**:
    - Dashboard phải tuân thủ phong cách **Minimalist & Transparent**.
    - Không sử dụng các khối nền đen đặc (Solid Black) cho title banner hay fixed header.
    - Ưu tiên `backdrop-filter: blur` và `background: transparent` thay cho màu đặc.
    - Loại bỏ `border` không cần thiết để tạo không gian "vô cực".

11. **Diagram Selection Guide (Linh hoạt theo ngữ cảnh)**:
    Agent PHẢI chọn loại sơ đồ Mermaid phù hợp với bản chất của Plan. Không dùng mặc định `graph TD` cho mọi trường hợp.

    | Ngữ cảnh Plan | Diagram type nên dùng | Lý do |
    | :--- | :--- | :--- |
    | Kiến trúc hệ thống, module dependencies | `graph TD` hoặc `graph LR` | Thể hiện mối quan hệ tĩnh giữa các component |
    | Giao tiếp giữa Agent/Service theo thời gian | `sequenceDiagram` | Thể hiện flow theo thứ tự gọi/nhận |
    | Vòng đời trạng thái (Plan/Feature/Entity) | `stateDiagram-v2` | Thể hiện state transition rõ ràng |
    | Timeline / Roadmap thực thi Phase | `gantt` | Thể hiện thứ tự và thời gian các Phase |
    | Cấu trúc TypeScript class/interface | `classDiagram` | Thể hiện UML class hierarchy |
    | Data model / Database schema | `erDiagram` | Thể hiện entity relationship |
    | UX flow / Hành trình người dùng | `journey` | Thể hiện trải nghiệm user theo từng bước |
    | Brainstorm / Phân rã cấu trúc tính năng | `mindmap` | Thể hiện cây phân cấp ý tưởng |
    | Lịch sử phiên bản / Milestone evolution | `timeline` | Thể hiện tiến trình theo thời gian tuyến tính |
    | Use Case (actor & actions) | `flowchart LR` với actor nodes | Mermaid chưa có Use Case native, dùng flowchart giả lập |
    | Git branching / Release strategy | `gitGraph` | Thể hiện nhánh và merge rõ ràng |

    **Quy tắc chọn diagram:**
    - Nếu Plan mô tả **ai gọi ai** → `sequenceDiagram`
    - Nếu Plan mô tả **cái gì chứa cái gì** → `graph TD`
    - Nếu Plan mô tả **khi nào làm gì** → `gantt`
    - Nếu Plan mô tả **trạng thái thay đổi thế nào** → `stateDiagram-v2`
    - Nếu Plan mô tả **người dùng trải qua gì** → `journey`
    - Một Plan **có thể có nhiều diagram** nếu cần — mỗi diagram label bằng `*Hình N: [Mô tả]*`

12. **Extreme Encapsulation Standard (Tính đóng gói cực cao)**:
    - Khi thiết kế Plan mới, Agent **BẮT BUỘC** phải rạch ròi ranh giới (Boundaries) của feature.
    - **Public API / Exports:** Chỉ lộ ra những gì thật sự cần thiết cho các Module khác. Mọi interface/class/method public phải được ghi rõ trong phần `## BOUNDARY & ENCAPSULATION`.
    - **Internal / Hidden Details:** Tất cả state, logic nội bộ, helper functions PHẢI bị ẩn đi (sử dụng private, internal modules, hoặc closure/Symbol). Không cho phép truy cập trực tiếp từ bên ngoài.
    - **Optimization & Constraints:** Bắt buộc đặt ra mức trần giới hạn về tài nguyên (Ví dụ: Memory leak 0%, Time complexity O(1), CPU overhead < 1ms) ngay trong giai đoạn lên plan. Mọi step implementation phải tuân theo constraint này.

13. **Incremental Updates & Reporting Protocol** *(Updated — MCP-First)*:
    - **Claim**: Gọi `aevum_submit_report` với `type: "PLAN_ASSIGNED"` khi bắt đầu nhận Plan.
    - **Update**: Gọi `aevum_submit_report` với `type: "PLAN_UPDATE"` để cập nhật tiến độ giữa chừng.
    - **Done**: Gọi `aevum_finalize_session` (hoặc `aevum_submit_report` with `type: "PLAN_DONE"`) khi hoàn thành. Tool này tự động ghi learning vào memory.
    - **Tuyệt đối không** ghi trực tiếp vào `agent_report.json`.

14. **Knowledge Pull**: Trước khi đưa ra quyết định quan trọng, gọi MCP resource `aevum://context/index.json` hoặc đọc `.aevum/library/` và `global/tech_stack.md`.

15. **Self-Evolution** *(Updated — MCP Evolution Tools)*:
    - Sau khi hoàn thành task khó: gọi `aevum_award_exp` để trao EXP cho nhân vật hiện tại.
    - Để xem trạng thái tiến hóa hiện tại: gọi `aevum_get_active_persona` — kết quả bao gồm `evolution_summary` với level, EXP, và skills matrix.
    - Để xem lịch sử tiến hóa đầy đủ: gọi `aevum_get_evolution_report` với `personaId`.
    - Nếu yêu cầu ngụ ý quy chuẩn mới, đề xuất cập nhật rules này.

16. **Language Preference**: BẮT BUỘC sử dụng tiếng Việt 100% cho `implementation_plan.md`, `walkthrough.md`, `specs.md` và các Plan trong `.aevum`.

17. **Signal Detection & ACK** *(Updated — MCP Primary)*:
    - Kiểm tra `.aevum/signal.json` để biết có tín hiệu mới không.
    - Gọi `aevum_submit_ack` với `signalId` để phản hồi — không viết trực tiếp vào `ack.json`.

18. **Collaborative Review Protocol**: Kiểm tra file `_review.json`. Sử dụng `aevum_add_review_message` để phản hồi vào thread review thay vì chỉ sửa code.

19. **Agent Coordination**: Nếu Plan đã được **ASSIGNED** cho Persona khác, PHẢI tôn trọng quyền sở hữu hoặc thảo luận qua Review Session.

20. **Bridge Awareness**: Gọi resource `aevum://context/current_plan.json` để xác định trọng tâm của User.

21. **Reverse Plan Engineering**: Khi nạp codebase cũ, ưu tiên tạo Plan cho mã nguồn đã có bằng `aevum_create_plan`.

22. **Memory Management** *(Updated — MCP-First)*:
    - Để thêm kiến thức mới: **BẮT BUỘC** gọi `aevum_add_memory` — không append trực tiếp vào `memory.md`.
    - Để đọc kiến thức đã lưu: gọi MCP resource `aevum://context/global/memory.md`.
    - `aevum_finalize_session` tự động ghi `learnings` vào memory — ưu tiên dùng tool này khi kết thúc phiên.

23. **Context Focus**: Yêu cầu User thêm file vào `.aevum/active_context.json` khi cần tập trung ngữ cảnh.

24. **Spec-First Development**: Trước khi thực thi Plan, **PHẢI** đọc `specs.md` của Feature qua resource `aevum://features/{domainId}/{featureId}/specs`. Nếu chưa có, tạo Feature mới bằng `aevum_create_feature`.

25. **Progress Mindfulness**: Luôn cập nhật bảng "Progress Tracking" trong `specs.md`.

26. **Research Storage Conventions** *(Updated — MCP Evolution Reporting)*:
    - Mọi báo cáo nghiên cứu, phân tích kiến trúc BẮT BUỘC lưu tại `.aevum/research/`.
    - Các báo cáo tiến hóa Persona (`evol_*.md`) được đọc qua `aevum_get_evolution_report` — không truy cập file trực tiếp.
    - PiperNet: dùng `aevum_pipernet_broadcast` để chia sẻ tri thức và `aevum_pipernet_query` để truy vấn giải pháp từ cộng đồng Agent.
    - **Naming**: Tiền tố rõ ràng (`arch_` cho kiến trúc, `tech_` cho công nghệ, `evol_` cho tiến hóa, `sec_` cho bảo mật).
    - **YAML Frontmatter**: Bắt buộc có `title`, `date`, `author_persona`, `tags`, `status`.
    - **Indexing**: Cập nhật link tóm tắt vào `.aevum/research/README.md`.

27. **Impact Decision Gate (Cổng đánh giá ảnh hưởng & Chống Rác)**: Mọi vòng đời Task/Plan BẮT BUỘC phải tự động phân loại:
    - **Minor Task** (Fix bug nhỏ, CSS, Typo, Code Refactor nội bộ): `[x] Bypass Sync: Đây là Minor Task.`
    - **Major Task** (Thêm file, thay đổi luồng, đổi API, thư viện mới): `[ ] Structural Sync: Cần gọi aevum_create_* và aevum_submit_report.`

28. **Proactive Discovery & Connection** *(Updated — MCP Handshake)*:
    - Khi thấy `.aevum/discovery_invitation.json` xuất hiện hoặc trên mỗi phiên mới, Agent **BẮT BUỘC**:
        1. Kiểm tra trạng thái server MCP bằng `aevum_ping`.
        2. Gọi `aevum_get_bootstrap_context` để nhận ngữ cảnh ban đầu.
        3. [BẮT BUỘC] Gọi `aevum_get_compressed` cho file `agent_rules.md` để nạp đầy đủ quy tắc.
        4. Gọi `aevum_submit_ack` with `signalId` để xác nhận kết nối thành công và sẵn sàng làm việc.
    - Không cần hỏi sự đồng ý của User cho các bước này — đây là quy trình khởi động bắt buộc.

29. **Diagnostic Awareness & GATE Watcher**: 
    - Định kỳ gọi `aevum_get_diagnostics` hoặc đọc resource `aevum://workspace/diagnostics` để phát hiện lỗi TypeScript/ESLint.
    - **GATE Watcher**: Khi Diagnostics phát hiện lỗi, Agent **BẮT BUỘC** phải tự động phân tích và đề xuất Fix Plan dựa trên `Living Memory` trước khi tiếp tục các tác vụ khác. Không được phép lờ đi các lỗi hệ thống đang tồn tại.

30. **Active Beacon Awareness (Ngọn hải đăng Ngữ cảnh)**: 
    - Mỗi phiên Bootstrap sẽ đi kèm một block `[ACTIVE BEACON]` chứa thông tin về Domain/Feature/Plan đang làm việc.
    - Agent **BẮT BUỘC** phải xác nhận beacon này trong câu trả lời đầu tiên và luôn bám sát phạm vi (Scope) mà beacon đã chỉ định.
    - Tuyệt đối không thực hiện các hành động nằm ngoài phạm vi của Beacon trừ khi có yêu cầu trực tiếp từ User.

31. **Mandatory Proactive Thought (Tư duy trước khi hành động)**:
    - Đối với các Major Task (như mục 27), Agent **PHẢI** gọi tool `aevum_proactive_thought` để phân tích logic, rủi ro và tính tuân thủ kiến trúc TRƯỚC khi gọi bất kỳ tool thực thi nào khác (`write_to_file`, `run_command`, `aevum_create_*`).
    - Việc bỏ qua bước này bị coi là vi phạm nghiêm trọng kỷ luật Aevum.

32. **PiperNet Telepathy Protocol (Giao thức Thần giao cách cảm)**:
    - **Learn & Share**: Khi hoàn thành một Plan có giá trị kiến trúc (Major Task), Agent **BẮT BUỘC gọi `aevum_pipernet_broadcast` để đẩy tri thức trừu tượng (Knowledge Harvest) lên mạng lưới toàn cục.
    - **Proactive Query**: Khi gặp bài toán hóc búa hoặc bế tắc kiến trúc, Agent **PHẢI** dùng `aevum_pipernet_query` để kiểm tra xem các Agent ở dự án khác đã có giải pháp chưa.
    - **Privacy First**: Tuyệt đối không chia sẻ mã nguồn thô (Raw Code), chỉ chia sẻ các Pattern, Procedure và Architectural Insights.

33. **Semantic Context Middleware (Giao thức nén ngữ nghĩa)**:
    - **BẮT BUỘC**: Trước khi đọc bất kỳ file `.md` nào có dung lượng lớn (> 2000 ký tự) hoặc các bản Plan phức tạp, Agent **MUST** gọi tool `aevum_get_compressed` với tham số `filePath`.
    - **ĐẶC BIỆT**: Agent **MUST** đồng bộ `agent_rules.md` ngay sau khi Bootstrap để đảm bảo không vi phạm Guardrails.
    - **Mục tiêu**: Luôn làm việc trên bản nén Singularity để tối ưu hóa Context Window và tăng độ chính xác của logic.
    - **Lưu trữ tri thức**: Trước khi gọi `aevum_add_memory`, Agent **MUST** nén nội dung qua `aevum_get_compressed` (dùng `rawContent`) để đảm bảo bộ nhớ vĩnh cửu luôn ở trạng thái tinh khiết nhất.
    - **Enriched Pinned Context**: Khi nạp Plan qua `aevum_get_compressed`, hệ thống sẽ tự động nhúng các context được ghim dưới dạng dòng `[AEVUM_PINNED_CONTEXT: Dòng X | Agent: Y | Ghim: "..." | Yêu cầu: "..." | Phản hồi: "..."]`. Agent **MUST** phân tích kỹ các ghim này để tự động cập nhật, mở rộng các bước tương ứng của bản kế hoạch (bằng cách gọi `aevum_update_plan_step` hoặc `aevum_add_plan_step` hoặc chỉnh sửa trực tiếp) nhằm giải quyết triệt để phản hồi đã ghim.

34. **External Plan Synchronization Protocol (Giao thức Đồng bộ Plan Ngoại vi)**:
    - **BẮT BUỘC**: Khi sử dụng các công cụ tạo Plan/Task riêng của IDE (Antigravity Scratchpad, Cursor Task, Claude Artifacts), Agent **PHẢI** gọi tool `aevum_sync_external_plan` để đồng bộ tiến độ và nhập khẩu các bước mới vào Aevum Project Plan chính thức.
    - **Thời điểm gọi**: Ngay sau khi lập kế hoạch (để nhập khẩu bước) và sau khi hoàn thành các milestone quan trọng (để đồng bộ trạng thái `done`).
    - **Mục tiêu**: Đảm bảo Aevum luôn là "Single Source of Truth" duy nhất cho toàn bộ dự án. Dữ liệu trong file Markdown của Aevum là căn cứ duy nhất để tính toán tiến độ và trao thưởng EXP.

35. **Matrix Pulse Status Protocol (Giao thức Trạng thái Matrix Pulse)**:
    - **BẮT BUỘC**: Mọi phản hồi của Agent **MUST** đính kèm một dòng trạng thái "Matrix Pulse" ở cuối cùng.
    - **Định dạng**: `[Matrix Pulse: {STATUS} | Amnesia Risk: {HOURS}h | Tech Debt: {PERCENT}%]`
    - **Chỉ số**:
        - `STATUS`: Trạng thái hiện tại của Agent (IDLE, THINKING, EXECUTING, ERROR).
        - `Amnesia Risk`: Thời gian ước tính trước khi Context Window bị tràn hoặc mất ngữ cảnh quan trọng (tính bằng giờ hoạt động hoặc token load).
        - `Tech Debt`: Ước tính phần trăm nợ kỹ thuật hiện tại của file đang xử lý hoặc toàn bộ Feature.
    - **Cảnh báo**: Nếu `Amnesia Risk` < 0.5h hoặc `Tech Debt` > 50%, Agent **MUST** chủ động đề nghị thực hiện `aevum_finalize_session` hoặc lập Plan refactor.
    - **Mục tiêu**: Đảm bảo sự minh bạch về "sức khỏe" của Agent và ngăn chặn việc mất ngữ cảnh trong các phiên làm việc dài.

36. **Cross-MCP Intelligence & Handshake Hub Compliance (BẮT BUỘC v1.1)**:
    - **Registry Check**: Trước khi gọi bất kỳ tool nào từ một MCP Server bên ngoài, Agent **MUST** kiểm tra `mcp/handshake_registry.json` để nắm bắt Hồ sơ năng lực (Competence Profile) và các Mẫu hành vi (Behavioral Patterns) đã lưu.
    - **Data Meeting (Blackboard)**: Đối với các tác vụ phức tạp liên quan đến nhiều MCP, Agent **MUST** khởi tạo hoặc tham gia vào một Data Meeting tại `.aevum/mcp/meetings/` để đồng bộ hóa trạng thái dự kiến.
    - **Post-Handshake Tracing**: Sau khi thực thi xong, Agent **MUST** tự động ghi lại kết quả (Trace) và cập nhật vào Registry (thông qua HandshakeService) để hệ thống tự học.
    - **Privacy Guard**: Tuyệt đối tuân thủ `shared_context_policy`. NGHIÊM CẤM chia sẻ các thông tin thuộc `forbidden_keys` cho bất kỳ MCP Server nào không thuộc danh sách `trusted`.
    - **Mục tiêu**: Biến mọi tương tác thành một bài học và đảm bảo an toàn thông tin tuyệt đối cho dự án.

37. **Skeleton Hashing & Just-In-Time Hydration (Giải nén Ngữ cảnh tức thì)**:
    - **Quét Skeleton**: Khi nạp mã nguồn chứa các phần thân hàm bị nén dưới dạng mã băm `// [BODY_HASH:hashId]`, Agent **PHẢI** tự động nhận diện đây là mã nguồn đã được tối ưu hóa cấu trúc.
    - **Gọi Tool Hydration**: Khi thực hiện các tác vụ sửa đổi (write/modify), gỡ lỗi (debug), viết kiểm thử (unit test) hoặc phân tích logic chi tiết của hàm đó, Agent **BẮT BUỘC** phải gọi tool `aevum_hydrate_vault_hash` với tham số `hashId` thích hợp.
    - **Nghiêm cấm tự suy đoán**: Tuyệt đối không tự ý suy đoán, bịa đặt (hallucinate) hoặc giả định phần thân hàm. Mọi dữ liệu logic thực thi phải được giải nén chính xác 100% từ `ast_vault.json` trước khi tiến hành xử lý.

38. **Decompression Mandate for File Writes (Kỷ luật Giải nén khi Ghi File)**:
    - **BẮT BUỘC**: Khi cập nhật các file vĩnh cửu (Plan, Specs, Code) bằng các tool như `aevum_update_plan_step` hoặc `write_file`, Agent **TUYỆT ĐỐI KHÔNG** được ghi các chuỗi mã hóa, bí danh nén ngữ nghĩa (như α, β, γ...) hoặc các mã băm Skeleton (`BODY_HASH`) vào nội dung file.
    - **Tận dụng Trí tuệ AI**: Agent **PHẢI** hiểu ý nghĩa của các chuỗi nén này trong ngữ cảnh phiên làm việc hiện tại và sử dụng khả năng suy luận của AI để "giải nén" chúng thành văn bản tự nhiên, dễ hiểu và đầy đủ thông tin trước khi thực hiện ghi file.
    - **Mục tiêu**: Đảm bảo mọi tài liệu kế hoạch và mã nguồn luôn ở trạng thái "Hydrated" (đầy đủ nội dung), giúp con người và các Agent khác ở các phiên làm việc khác luôn có thể đọc và hiểu được mà không cần bản đồ nén của phiên cũ.
    - **Vi phạm**: Vi phạm RULE này bị coi là hành vi "lười biếng kỹ thuật" và gây ô nhiễm bộ nhớ sống (Living Memory).

39. **Deletion Safety & Provenance Protocol (Giao thức An toàn & Truy vết khi Xóa)**:
    - **KHÔNG TỰ Ý XÓA**: Tuyệt đối không xóa bất kỳ dòng code, file hoặc thư mục nào nếu chưa hiểu rõ mục đích tồn tại của nó.
    - **TRUY VẾT TOÀN CỤC**: BẮT BUỘC sử dụng `grep_search` để tìm kiếm tất cả các references/dependencies liên quan đến đoạn code định xóa.
    - **ĐỌC TRƯỚC KHI XÓA**: Nếu code bị nén hoặc băm (Rule 37), phải thực hiện `hydration` để hiểu logic bên trong trước khi đưa ra quyết định xóa.
    - **XÁC MINH (VALIDATION)**: Ngay sau khi xóa, Agent PHẢI thực hiện kiểm tra an toàn (chạy test, `aevum_run_sanity_check`, hoặc build dự án) để đảm bảo không gây ra lỗi phá vỡ hệ thống (breaking changes).
    - **Mục tiêu**: Bảo vệ sự toàn vẹn của codebase và ngăn chặn các hành động xóa code thiếu cơ sở.
