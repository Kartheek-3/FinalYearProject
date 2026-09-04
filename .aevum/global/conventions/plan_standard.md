# Aevum Plan Architecture Standard (v2.0)
Tiêu chuẩn này được thiết lập sau khi thử nghiệm thành công mô hình "Interactive Dashboard" trên các dự án mẫu (Oliva). Mục tiêu là biến mọi Plan thành một thực thể có thể quan sát, tương tác và đồng bộ thời gian thực.

## 1. Cấu trúc bắt buộc của một Plan

### 1.1. Frontmatter (YAML)
Mọi plan phải bắt đầu bằng khối frontmatter để Dashboard có thể parse tự động:
```yaml
---
plan_name: [tên_file].md
domain: [id_domain]
feature: [id_feature]
version: "x.y.z"
status: [todo | assigned | done | blocked]
authors: ["ID_AGENT"]
dependencies: ["plan_khác.md"]
---
```

### 1.2. Architectural Context (Bối cảnh kiến trúc)
Phần này BẮT BUỘC chứa ít nhất một sơ đồ trực quan (SVG hoặc Mermaid) mô tả sự thay đổi mà plan này mang lại.
- Hình ảnh này sẽ được Dashboard hiển thị ở vị trí ưu tiên (Top Banner).

### 1.3. Implementation Steps (Các bước thực thi)
Sử dụng format checkbox chuẩn. Để hỗ trợ **Task Anchoring** (định vị task trên code), sử dụng cú pháp:
- `[ ] [file_path:line] Nội dung task`
- Ví dụ: `- [ ] [src/core/bus.ts:45] Triển khai EventEmitter`

Dashboard và Agent sẽ sử dụng thông tin này để:
- Đặt `Avatar Markers` tự động trên file code tương ứng.
- Hiển thị tooltip mô tả task khi hover vào marker trên code.
- Đồng bộ trạng thái task ngay khi code được sửa đổi (nếu tích hợp sâu).

## 2. Tích hợp Dashboard & Telemetry

### 2.1. Absolute Positioning & Visual Progress
- **Header Banner**: Tự động hiển thị thanh tiến độ và sơ đồ kiến trúc từ `ARCHITECTURAL CONTEXT`.
- **Progress Pulse**: Vòng tròn tiến độ sẽ nhấp nháy (Glow Pulse) khi plan đang ở trạng thái `in-progress`.
- **Diagram Overlay**: Sơ đồ kiến trúc sẽ được đưa lên khu vực banner để dễ dàng quan sát khi scroll.

### 2.2. Mini Chat & Avatar Markers
- Khi một dev đang thực thi một bước trong Plan, họ có thể mở Mini Chat ngay tại dòng code đó để hỏi AI về các tiêu chuẩn kiến trúc quy định trong Plan.

## 3. Quy trình đồng bộ (Sync Protocol)
1. **Plan Creation**: Tạo plan qua `aevum_create_plan`.
2. **Dashboard Render**: Preview-script quét Frontmatter và Diagram.
3. **Task Execution**: Dev check vào `[x]`, hệ thống gọi `/api/command?command=aevum.toggleCheckbox` để đồng bộ `index.json`.
4. **Visual Evidence**: Các ảnh chụp màn hình hoặc kết quả test được lưu vào `.aevum/evidence/` và liên kết ngược lại Plan.

---
*Phê duyệt bởi: Aevum Architect System - 2026*
