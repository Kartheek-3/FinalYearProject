# Architecture Overview

## High Level Design
Aevum là một hệ sinh thái Agentic đa tầng, tập trung vào việc quản lý ngữ cảnh và tri thức vĩnh cửu.

### 1. Handshake Hub & Shared Context Store (SCS)
Hệ thống sử dụng cơ chế Handshake Hub để điều phối các tương tác giữa Agent và MCP Servers. Mọi tương tác đều được lưu lại trong `Handshake Registry` để tự học và tối ưu hóa hành vi. SCS cung cấp lớp bộ nhớ dùng chung (Blackboard) giúp các Agent hội ý và đồng bộ hóa trạng thái trước khi thực thi tác vụ.
