import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Key, Webhook, Copy, Eye, EyeOff, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { OrgAdminOutletContext } from './OrgAdminLayout';
import { logger } from '@/lib/utils/logger';
import { createHmac, randomBytes } from 'crypto-browserify';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: { toDate?: () => Date } | null;
  lastUsedAt?: { toDate?: () => Date } | null;
  revokedAt?: { toDate?: () => Date } | null;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: { toDate?: () => Date } | null;
  lastTriggeredAt?: { toDate?: () => Date } | null;
  failureCount: number;
}

export default function OrgIntegrations() {
  const { orgDetails } = useOutletContext<OrgAdminOutletContext>();
  const { effectiveOrgId, profile } = useAuth();
  const { toast } = useToast();
  const orgId = effectiveOrgId || profile?.organizationId;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // API Key creation
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [creating, setCreating] = useState(false);

  // Webhook creation
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadIntegrations();
  }, [orgId]);

  async function loadIntegrations() {
    if (!orgId) return;
    setLoading(true);
    try {
      const [keysSnap, webhooksSnap] = await Promise.all([
        getDocs(collection(getDb(), `organizations/${orgId}/integration-api-keys`)),
        getDocs(collection(getDb(), `organizations/${orgId}/integration-webhooks`)),
      ]);

      setApiKeys(keysSnap.docs.map(d => ({ id: d.id, ...d.data() } as ApiKey)));
      setWebhooks(webhooksSnap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookEndpoint)));
    } catch (err) {
      logger.error('[OrgIntegrations] Failed to load', err);
      toast({
        title: 'Failed to load integrations',
        description: 'Please refresh the page to try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey() {
    if (!orgId || !profile?.uid || !newKeyName.trim()) return;
    
    setCreating(true);
    try {
      // Generate secure API key (64 hex chars = 32 bytes)
      const keyBytes = randomBytes(32);
      const keyValue = keyBytes.toString('hex');
      
      // Hash the key for storage
      const keyHash = createHmac('sha256', process.env.VITE_API_KEY_SALT || 'default-salt')
        .update(keyValue)
        .digest('hex');

      // Store metadata only
      const keyDoc = await addDoc(collection(getDb(), `organizations/${orgId}/integration-api-keys`), {
        organizationId: orgId,
        name: newKeyName.trim(),
        keyHash,
        keyPreview: `oa_${keyValue.substring(0, 8)}...${keyValue.substring(keyValue.length - 4)}`,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        revokedAt: null,
      });

      setApiKeys(prev => [...prev, {
        id: keyDoc.id,
        name: newKeyName.trim(),
        keyPreview: `oa_${keyValue.substring(0, 8)}...${keyValue.substring(keyValue.length - 4)}`,
        createdAt: null,
        revokedAt: null,
      }]);

      setNewKeyValue(`oa_${keyValue}`);
      setShowNewKey(true);
      setNewKeyName('');
      
      toast({ title: 'API key created', description: 'Copy your key now — it will only be shown once.' });
    } catch (err) {
      logger.error('[OrgIntegrations] Failed to create API key', err);
      toast({
        title: 'Failed to create API key',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  async function revokeApiKey(keyId: string) {
    if (!orgId) return;
    try {
      await updateDoc(doc(getDb(), `organizations/${orgId}/integration-api-keys`, keyId), {
        revokedAt: serverTimestamp(),
      });
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, revokedAt: {} as any } : k));
      toast({ title: 'API key revoked', description: 'This key can no longer be used.' });
    } catch (err) {
      logger.error('[OrgIntegrations] Failed to revoke key', err);
      toast({
        title: 'Failed to revoke key',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  async function createWebhook() {
    if (!orgId || !newWebhookUrl.trim()) return;

    try {
      const webhookDoc = await addDoc(collection(getDb(), `organizations/${orgId}/integration-webhooks`), {
        organizationId: orgId,
        url: newWebhookUrl.trim(),
        secret: newWebhookSecret || randomBytes(32).toString('hex'),
        events: ['assessment.completed'],
        enabled: true,
        createdAt: serverTimestamp(),
        failureCount: 0,
      });

      setWebhooks(prev => [...prev, {
        id: webhookDoc.id,
        url: newWebhookUrl.trim(),
        events: ['assessment.completed'],
        enabled: true,
        createdAt: null,
        failureCount: 0,
      }]);

      setShowCreateWebhook(false);
      setNewWebhookUrl('');
      setNewWebhookSecret('');
      
      toast({ title: 'Webhook created', description: 'Your endpoint will receive assessment.completed events.' });
    } catch (err) {
      logger.error('[OrgIntegrations] Failed to create webhook', err);
      toast({
        title: 'Failed to create webhook',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  async function toggleWebhook(webhookId: string, enabled: boolean) {
    if (!orgId) return;
    try {
      await updateDoc(doc(getDb(), `organizations/${orgId}/integration-webhooks`, webhookId), {
        enabled: !enabled,
      });
      setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, enabled: !enabled } : w));
      toast({ title: enabled ? 'Webhook disabled' : 'Webhook enabled' });
    } catch (err) {
      logger.error('[OrgIntegrations] Failed to toggle webhook', err);
      toast({
        title: 'Failed to update webhook',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  }

  if (!orgDetails) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect One Assess to your CRM or other systems.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription className="mt-1.5">
                Generate keys to authenticate inbound API requests
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateKey(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPreview}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt?.toDate?.()?.toLocaleDateString() || 'Never'}
                    </TableCell>
                    <TableCell>
                      {key.revokedAt ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!key.revokedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeApiKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription className="mt-1.5">
                Receive notifications when assessments are completed
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateWebhook(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks configured. Add one to receive events.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Failures</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map(webhook => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium max-w-xs truncate">{webhook.url}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">assessment.completed</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {webhook.lastTriggeredAt?.toDate?.()?.toLocaleDateString() || 'Never'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {webhook.failureCount > 0 && (
                        <span className="text-destructive">{webhook.failureCount}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                        {webhook.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWebhook(webhook.id, webhook.enabled)}
                      >
                        {webhook.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Learn how to integrate with One Assess</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/integrations/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View API Documentation
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKey || showNewKey} onOpenChange={(open) => {
        if (!open) {
          setShowCreateKey(false);
          setShowNewKey(false);
          setNewKeyName('');
          setNewKeyValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showNewKey ? 'API Key Created' : 'Create API Key'}
            </DialogTitle>
            <DialogDescription>
              {showNewKey 
                ? 'Copy your key now — it will only be shown once.'
                : 'Give your API key a descriptive name.'}
            </DialogDescription>
          </DialogHeader>
          {showNewKey ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm break-all">{newKeyValue}</code>
              </div>
              <Button onClick={() => copyToClipboard(newKeyValue)} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production CRM"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {showNewKey ? (
              <Button onClick={() => {
                setShowNewKey(false);
                setNewKeyValue('');
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                  Cancel
                </Button>
                <Button onClick={createApiKey} disabled={creating || !newKeyName.trim()}>
                  {creating ? 'Creating...' : 'Create Key'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a URL to receive assessment.completed events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-crm.com/webhooks/oneassess"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="webhook-secret">Signing Secret (optional)</Label>
              <Input
                id="webhook-secret"
                placeholder="Leave blank to auto-generate"
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to verify webhook signatures
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>
              Cancel
            </Button>
            <Button onClick={createWebhook} disabled={!newWebhookUrl.trim()}>
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
