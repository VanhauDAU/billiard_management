export type StoreSchemaMigration = {
  version: number
  name: string
  up: (storage: DurableObjectStorage) => void
}