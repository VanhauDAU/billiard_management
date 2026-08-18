# Billiards POS Desktop

Electron + React + TypeScript desktop client cho hệ thống quản lý cửa hàng billiards.

## Security boundary

```text
Renderer
   │ window.desktopApi
   ▼
Preload
   │ narrow typed IPC
   ▼
Main Process
   ├── backend HTTP
   ├── installation identity
   ├── encrypted device credential
   ├── future printing/local DB/sync
   └── updater
```

Nguyên tắc hiện tại:

- `contextIsolation: true`.
- `nodeIntegration: false`.
- renderer sandbox bật.
- Renderer không nhận `deviceSecret`.
- Privileged IPC chỉ chấp nhận top-level trusted renderer.
- Packaged app chỉ kết nối backend qua HTTPS.
- HTTP backend chỉ được phép với loopback trong development.

## Device identity

Local app data:

```text
app.getPath('userData')/
└── device/
    ├── installation.json
    └── credential.bin
```

- `installation.json`: UUID ổn định cho installation, không phải secret.
- `credential.bin`: encrypted device ID + secret bằng Electron async `safeStorage`.
- File credential hỏng dẫn tới reactivation, không tự xóa/replace trước khi activation mới thành công.
- Installation identity hỏng fail-closed; app không tự sinh identity mới để tránh tạo device mồ côi.

## DeviceGate

Renderer hiện có startup states:

- `not_activated`
- `needs_reactivation`
- `ready`
- `blocked`
- `unavailable`
- `local_error`

Activation UI chỉ gửi `activationToken + name` qua IPC. Installation ID, platform, app version và raw credential do Main/Worker quản lý.

## Environment

Copy hoặc tạo env phù hợp từ:

```text
apps/desktop/.env.example
```

Development mặc định:

```env
MAIN_VITE_API_BASE_URL=http://localhost:8787
```

Packaged build phải dùng HTTPS backend.

## Development

Từ repository root:

```bash
pnpm dev:desktop
```

Hoặc trong `apps/desktop`:

```bash
pnpm dev
```

Electron 43 dùng lazy binary download. Script `dev/start` chạy `install-electron --no` trước khi mở Electron để fresh clone không gặp lỗi thiếu binary.

Worker phải chạy riêng:

```bash
pnpm dev:worker
```

## Typecheck / build

Từ root:

```bash
pnpm typecheck:desktop
pnpm build:desktop
```

Gate đầy đủ:

```bash
pnpm run ci
```

## Packaging

Scripts hiện có:

```bash
pnpm --filter @billiards/desktop build:unpack
pnpm --filter @billiards/desktop build:win
pnpm --filter @billiards/desktop build:mac
pnpm --filter @billiards/desktop build:linux
```

Packaging/release chưa phải production-ready gate. Trước pilot cần review:

- `electron-builder.yml` identifiers/artifact metadata,
- code signing/notarization,
- Windows installer/update channel,
- production backend URL,
- packaged activation + restart smoke test,
- update không phá local operational data.

## Bước tiếp theo

Sau DeviceGate, Desktop sẽ thêm Employee PIN AuthGate nhưng tiếp tục giữ session credential ở Main Process, không đẩy security token trực tiếp vào Renderer.