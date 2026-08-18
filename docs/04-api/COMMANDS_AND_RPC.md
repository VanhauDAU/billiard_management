# Commands Envelope & Store DO RPC

Cập nhật: **2026-08-19**

Tài liệu này mô tả giao thức Command Envelope, nguyên tắc bất biến về ranh giới danh tính (ADR-002) và các RPC methods của Store Durable Object.

---

## 1. Cấu trúc Command Envelope

### 1.1. Client Command Envelope (Untrusted)
Dữ liệu gửi từ client lên Worker chỉ chứa ý định thao tác (intent) và timestamp khai báo từ client:

```json
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "issuedAt": "2026-08-19T01:00:00.000Z",
  "commandType": "CreateTable",
  "payload": {
    "tableTypeId": "660e8400-e29b-41d4-a716-446655440001",
    "tableNumber": 1,
    "name": "Bàn 01",
    "sortOrder": 10
  }
}
```

> **Quy tắc bảo mật:** Client **không được phép** gửi `storeId`, `deviceId`, hay `actorId` trong envelope.

### 1.2. Server Trusted Command Envelope (Enriched)
Sau khi Worker hoàn tất xác thực Device, User và Quyền hạn, Worker sẽ bao bọc lại thành `TrustedCommandEnvelope` trước khi gọi Store DO:

```json
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "issuedAt": "2026-08-19T01:00:00.000Z",
  "commandType": "CreateTable",
  "payload": { ... },
  "storeId": "trusted-store-uuid-from-d1",
  "deviceId": "trusted-device-uuid",
  "actorId": "trusted-user-uuid"
}
```

---

## 2. Các Table Commands đã triển khai (M1.4)

| Command Type | Mô tả | Payload Fields |
|---|---|---|
| `CreateTableType` | Tạo mới loại bàn | `name`, `description?`, `sortOrder?` |
| `UpdateTableType` | Chỉnh sửa loại bàn | `tableTypeId`, `name`, `description?`, `sortOrder?` |
| `SetTableTypeStatus` | Đổi trạng thái loại bàn | `tableTypeId`, `status` (`active` / `disabled`) |
| `CreateTable` | Tạo mới bàn | `tableTypeId`, `tableNumber`, `name`, `sortOrder?` |
| `UpdateTable` | Chỉnh sửa thông tin bàn | `tableId`, `tableTypeId`, `tableNumber`, `name`, `sortOrder?` |
| `SetTableStatus` | Đổi trạng thái bàn | `tableId`, `status` (`available` / `playing` / `disabled`) |

---

## 3. Store DO RPC Interface

Store Durable Object cung cấp các RPC methods giao tiếp trực tiếp với Worker:

```ts
export class StoreDurableObject extends DurableObject {
  // Thực thi lệnh mutation (có idempotency và transaction)
  async executeTableCommand(command: TrustedCommandEnvelope): Promise<TableCommandResult>;

  // Đọc danh sách bàn
  async listTables(): Promise<BilliardTable[]>;

  // Đọc danh sách loại bàn
  async listTableTypes(): Promise<TableType[]>;

  // Health check & verify identity
  async checkHealth(): Promise<{ status: string; storeId: string; schemaVersion: number }>;
}
```
