import { ExecutionMetadata } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NCredential } from '../types.js';

export interface CredentialListInput {
  type?: string;
}

export interface CredentialSummary {
  id: string;
  name: string;
  type: string;
}

export interface CredentialListOutput {
  credentials: CredentialSummary[];
  meta: ExecutionMetadata;
}

/**
 * List credentials
 */
export async function credentialList(
  client: N8NClient,
  input: CredentialListInput
): Promise<CredentialListOutput> {
  const startTime = Date.now();

  // Call N8N API
  const response = await client.listCredentials({
    type: input.type,
  });

  // Transform to summary format
  const credentials: CredentialSummary[] = response.map((cred: N8NCredential) => ({
    id: cred.id,
    name: cred.name,
    type: cred.type,
  }));

  // Execution metadata
  const meta: ExecutionMetadata = {
    execution_time_ms: Date.now() - startTime,
    rows_returned: credentials.length,
  };

  return {
    credentials,
    meta,
  };
}
