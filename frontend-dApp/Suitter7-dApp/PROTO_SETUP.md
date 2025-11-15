# Proto Files Setup

To use gRPC with Sui, you need to download the proto files from the Sui repository.

## Steps:

1. Create a `protos` directory in the project root:
   ```bash
   mkdir -p protos/sui/rpc/v2
   ```

2. Download the proto files from the Sui repository:
   ```bash
   cd protos
   git clone --depth 1 --filter=blob:none --sparse https://github.com/MystenLabs/sui.git
   cd sui
   git sparse-checkout set crates/sui-proc-macros/src/proto
   # Copy the proto files to the protos directory structure
   ```

   Or manually download from:
   - https://github.com/MystenLabs/sui/tree/main/crates/sui-framework/packages/sui-framework/sources/sui/rpc/v2

3. Required proto files:
   - `state_service.proto`
   - `ledger_service.proto`
   - `transaction_execution_service.proto`
   - `subscription_service.proto` (optional, for streaming)

4. Place them in: `protos/sui/rpc/v2/`

## Alternative: Use JSON-RPC

If you prefer not to set up proto files, you can modify `useContract.ts` to use the Sui SDK's JSON-RPC client instead, which is already configured in the project.

