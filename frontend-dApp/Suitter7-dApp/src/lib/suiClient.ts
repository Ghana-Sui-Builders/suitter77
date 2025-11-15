// Note: gRPC client requires Node.js environment and proto files
// This file is optional - the app uses JSON-RPC by default via @mysten/sui
// Uncomment and configure if you want to use gRPC

/*
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { getFullnodeUrl } from '@mysten/sui/client';

// Configuration
const GRPC_PORT = 443;
// Note: Proto files should be placed in public/protos or downloaded at build time
// For now, we'll use a relative path that works in both dev and build
const PROTO_BASE_PATH = path.resolve(import.meta.url.replace('file://', '').replace('/src/lib/suiClient.ts', ''), '../../protos');

// Get the gRPC endpoint based on network
export function getGrpcEndpoint(network: 'devnet' | 'testnet' | 'mainnet' = 'testnet'): string {
  const url = getFullnodeUrl(network);
  // Extract hostname from URL and use port 443 for gRPC
  const hostname = new URL(url).hostname;
  return `${hostname}:${GRPC_PORT}`;
}

// Load proto definitions
function loadProto(protoFile: string) {
  const protoPath = path.join(PROTO_BASE_PATH, protoFile);
  
  return protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_BASE_PATH],
  });
}

// Create gRPC client for a service
export function createGrpcClient<T>(
  protoFile: string,
  serviceName: string,
  network: 'devnet' | 'testnet' | 'mainnet' = 'testnet'
): T {
  const packageDefinition = loadProto(protoFile);
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const Service = proto[serviceName];
  
  if (!Service) {
    throw new Error(`Service ${serviceName} not found in ${protoFile}`);
  }
  
  const endpoint = getGrpcEndpoint(network);
  return new Service(endpoint, grpc.credentials.createSsl()) as T;
}

// StateService client
export interface StateServiceClient {
  GetObject: (request: any, callback: (error: any, response: any) => void) => void;
  ListOwnedObjects: (request: any, callback: (error: any, response: any) => void) => void;
  GetCoinInfo: (request: any, callback: (error: any, response: any) => void) => void;
  ListDynamicFields: (request: any, callback: (error: any, response: any) => void) => void;
}

// LedgerService client
export interface LedgerServiceClient {
  GetTransaction: (request: any, callback: (error: any, response: any) => void) => void;
  GetCheckpoint: (request: any, callback: (error: any, response: any) => void) => void;
  BatchGetObjects: (request: any, callback: (error: any, response: any) => void) => void;
  BatchGetTransactions: (request: any, callback: (error: any, response: any) => void) => void;
}

// TransactionExecutionService client
export interface TransactionExecutionServiceClient {
  ExecuteTransaction: (request: any, callback: (error: any, response: any) => void) => void;
  SimulateTransaction: (request: any, callback: (error: any, response: any) => void) => void;
}

// Create clients
export function createStateServiceClient(network: 'devnet' | 'testnet' | 'mainnet' = 'testnet'): StateServiceClient {
  return createGrpcClient<StateServiceClient>(
    'sui/rpc/v2/state_service.proto',
    'sui.rpc.v2.StateService',
    network
  );
}

export function createLedgerServiceClient(network: 'devnet' | 'testnet' | 'mainnet' = 'testnet'): LedgerServiceClient {
  return createGrpcClient<LedgerServiceClient>(
    'sui/rpc/v2/ledger_service.proto',
    'sui.rpc.v2.LedgerService',
    network
  );
}

export function createTransactionExecutionServiceClient(
  network: 'devnet' | 'testnet' | 'mainnet' = 'testnet'
): TransactionExecutionServiceClient {
  return createGrpcClient<TransactionExecutionServiceClient>(
    'sui/rpc/v2/transaction_execution_service.proto',
    'sui.rpc.v2.TransactionExecutionService',
    network
  );
}

// Helper function to convert gRPC callback to Promise
export function promisifyGrpcCall<T>(
  client: any,
  method: string,
  request: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    client[method](request, (error: any, response: T) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}
*/

