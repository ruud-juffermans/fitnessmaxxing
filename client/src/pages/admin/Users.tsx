import { useEffect, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { admin } from '../../api';
import { useAuth } from '../../auth';
import { Button, H1, Input, Muted, PageHeader } from '../../components/ui';
import type { AdminUser } from '../../types';

// Admin user-management console. Lists every account with metadata + activity
// counts (never the actual workout content) and offers per-user actions: verify
// email, send a password-reset link, revoke sessions, suspend/unsuspend, delete.
export function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Id of the user whose action is currently in flight (disables that row).
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(q = search) {
    setLoading(true);
    setError(null);
    try {
      const { users } = await admin.listUsers(q.trim() || undefined);
      setUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  // Run an action, show its result, and refresh the list. `confirm` gates
  // destructive actions behind a browser confirmation.
  async function act(
    id: string,
    fn: () => Promise<unknown>,
    success: string,
    confirmMsg?: string,
  ) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader>
        <H1>Users</H1>
        <Muted>{users.length} shown</Muted>
      </PageHeader>

      <SearchForm onSubmit={onSearch}>
        <Input
          type="search"
          placeholder="Search by email or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="primary">Search</Button>
        {search && (
          <Button type="button" onClick={() => { setSearch(''); load(''); }}>Clear</Button>
        )}
      </SearchForm>

      {error && <Msg $error>{error}</Msg>}
      {notice && <Msg>{notice}</Msg>}

      {loading ? (
        <Muted>Loading…</Muted>
      ) : users.length === 0 ? (
        <Muted>No users found.</Muted>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Status</Th>
                <Th>Activity</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                const disabled = busyId === u.id;
                return (
                  <tr key={u.id}>
                    <Td>
                      <strong>{u.name || '—'}</strong>
                      <Muted>{u.email}</Muted>
                    </Td>
                    <Td>
                      <Badges>
                        {u.role === 'admin' && <Badge $tone="admin">Admin</Badge>}
                        {u.disabledAt && <Badge $tone="danger">Suspended</Badge>}
                        {u.isGuest && <Badge>Guest</Badge>}
                        {u.emailVerified ? (
                          <Badge $tone="ok">Verified</Badge>
                        ) : (
                          <Badge $tone="warn">Unverified</Badge>
                        )}
                      </Badges>
                    </Td>
                    <Td>
                      <Muted>
                        {u._count.workouts} workouts · {u._count.journalEntries} journal entries · {u._count.habits} habits
                      </Muted>
                    </Td>
                    <Td>
                      <Muted>{new Date(u.createdAt).toLocaleDateString()}</Muted>
                    </Td>
                    <Td>
                      <Actions>
                        {!u.emailVerified && (
                          <ActionBtn
                            disabled={disabled}
                            onClick={() => act(u.id, () => admin.verifyEmail(u.id), 'Email marked verified.')}
                          >
                            Verify
                          </ActionBtn>
                        )}
                        {!u.isGuest && (
                          <ActionBtn
                            disabled={disabled}
                            onClick={() => act(u.id, () => admin.resetPassword(u.id), `Password-reset link sent to ${u.email}.`)}
                          >
                            Reset password
                          </ActionBtn>
                        )}
                        <ActionBtn
                          disabled={disabled || isSelf}
                          title={isSelf ? "You can't revoke your own sessions here." : undefined}
                          onClick={() => act(u.id, () => admin.revokeSessions(u.id), 'Sessions revoked.')}
                        >
                          Sign out everywhere
                        </ActionBtn>
                        {u.disabledAt ? (
                          <ActionBtn
                            disabled={disabled}
                            onClick={() => act(u.id, () => admin.unsuspend(u.id), 'Account reinstated.')}
                          >
                            Unsuspend
                          </ActionBtn>
                        ) : (
                          <ActionBtn
                            variant="danger"
                            disabled={disabled || isSelf}
                            title={isSelf ? "You can't suspend your own account." : undefined}
                            onClick={() => act(u.id, () => admin.suspend(u.id), 'Account suspended.')}
                          >
                            Suspend
                          </ActionBtn>
                        )}
                        <ActionBtn
                          variant="danger"
                          disabled={disabled || isSelf}
                          title={isSelf ? "You can't delete your own account." : undefined}
                          onClick={() =>
                            act(
                              u.id,
                              () => admin.deleteUser(u.id),
                              'Account deleted.',
                              `Permanently delete ${u.email} and all of their data? This cannot be undone.`,
                            )
                          }
                        >
                          Delete
                        </ActionBtn>
                      </Actions>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}

const SearchForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.lg};

  input { flex: 1; max-width: 360px; }
`;

const Msg = styled.div<{ $error?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.success)};
  margin-bottom: ${({ theme }) => theme.space.md};
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: top;

  strong { display: block; }
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Badge = styled.span<{ $tone?: 'ok' | 'warn' | 'danger' | 'admin' }>`
  display: inline-block;
  padding: 2px 9px;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};

  ${({ $tone, theme }) =>
    $tone === 'ok' && `color: ${theme.colors.success}; border-color: ${theme.colors.success};`}
  ${({ $tone, theme }) =>
    $tone === 'warn' && `color: ${theme.colors.warning}; border-color: ${theme.colors.warning};`}
  ${({ $tone, theme }) =>
    $tone === 'danger' && `color: ${theme.colors.danger}; border-color: ${theme.colors.danger};`}
  ${({ $tone, theme }) =>
    $tone === 'admin' && `color: ${theme.colors.primary}; border-color: ${theme.colors.primary};`}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ActionBtn = styled(Button)`
  min-height: 30px;
  padding: 4px 10px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  white-space: nowrap;
`;
