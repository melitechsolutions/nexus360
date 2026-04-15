import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Download, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleLayout } from "@/components/ModuleLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const FinanceSettingsPage: React.FC = () => {
  const [vendorId, setVendorId] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [payableAccount, setPayableAccount] = useState('');
  const setAccounts = trpc.finance.setVendorAccounts.useMutation();
  const { data: defaults } = trpc.finance.getDefaults.useQuery();
  const vendorQuery = trpc.finance.getVendorAccounts.useQuery(vendorId, { enabled: !!vendorId });
  const listVendors = trpc.finance.listVendorAccounts.useQuery(undefined);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorPage, setVendorPage] = useState(0);
  const pageSize = 5;

  const save = async () => {
    await setAccounts.mutateAsync({ vendorId, expenseAccountId: expenseAccount, payableAccountId: payableAccount });
    toast.success('Vendor accounts saved');
  };

  const [journalId, setJournalId] = useState('');
  const [notesSearch, setNotesSearch] = useState('');
  const reconcile = trpc.finance.reconcileEntry.useMutation();
  const updateRec = trpc.finance.updateReconciliation.useMutation();
  const undoRec = trpc.finance.undoReconciliation.useMutation();
  const { data: recs, refetch: refetchRecs } = trpc.finance.listReconciliations.useQuery(
    journalId || notesSearch ? { journalEntryId: journalId || undefined, notesSearch: notesSearch || undefined } : undefined
  );

  const reconcileNow = async () => {
    if (!journalId) return;
    await reconcile.mutateAsync({ journalEntryId: journalId });
    await refetchRecs();
    toast.success('Entry reconciled successfully');
  };

  const doEdit = async (id: string) => {
    const notes = prompt('Enter new notes');
    if (notes === null) return;
    await updateRec.mutateAsync({ id, notes });
    await refetchRecs();
  };

  const doUndo = async (id: string) => {
    if (!confirm('Undo this reconciliation?')) return;
    await undoRec.mutateAsync(id);
    await refetchRecs();
  };

  // when vendorId changes, populate fields if mapping exists
  React.useEffect(() => {
    if (vendorQuery.data) {
      setExpenseAccount(vendorQuery.data.expense || '');
      setPayableAccount(vendorQuery.data.payable || '');
    }
  }, [vendorQuery.data]);

  return (
    <ModuleLayout
      title="Finance Settings"
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/accounting" },
        { label: "Settings" },
      ]}
    >
      <div>
      {defaults && (
        <div>
          <h3>Default Accounts</h3>
          <div>Expense: {defaults.expense || '<none>'}</div>
          <div>Payable: {defaults.payable || '<none>'}</div>
        </div>
      )}
      <div>
        <label>Vendor ID</label>
        <input value={vendorId} onChange={e => setVendorId(e.target.value)} />
      </div>
      <div>
        <label>Expense Account</label>
        <input value={expenseAccount} onChange={e => setExpenseAccount(e.target.value)} />
      </div>
      <div>
        <label>Payable Account</label>
        <input value={payableAccount} onChange={e => setPayableAccount(e.target.value)} />
      </div>
      <button onClick={save}>Save</button>
      <div>
        <button onClick={() => listVendors.refetch()}>Refresh Vendor List</button>
        <button onClick={async () => {
          const exp = await trpc.finance.exportVendorAccounts.query();
          const csv = ['VendorId,ExpenseAccount,PayableAccount', ...(Array.isArray(exp) ? exp : []).map((v: any) => `${v.vendorId},${v.expense || ''},${v.payable || ''}`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendor-accounts.csv'; a.click(); URL.revokeObjectURL(a.href);
          toast.success('Vendor accounts exported');
        }}>Export Settings</button>
        <div>
          <label>Search vendors:</label>
          <input value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); setVendorPage(0); }} />
        </div>
        {listVendors.data && (() => {
          const filtered = listVendors.data.filter(v => v.vendorId.includes(vendorSearch));
          const paged = filtered.slice(vendorPage * pageSize, vendorPage * pageSize + pageSize);
          return (
            <>
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Expense</TableHead><TableHead>Payable</TableHead></TableRow></TableHeader>
                <TableBody>
                  {paged.map(v => (
                    <TableRow key={v.vendorId}>
                      <TableCell>{v.vendorId}</TableCell>
                      <TableCell>{v.expense || '-'}</TableCell>
                      <TableCell>{v.payable || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div>
                <button disabled={vendorPage === 0} onClick={() => setVendorPage(p => p - 1)}>Prev</button>
                <button disabled={(vendorPage + 1) * pageSize >= filtered.length} onClick={() => setVendorPage(p => p + 1)}>Next</button>
              </div>
            </>
          );
        })()}
      </div>

      <h2>Reconciliation</h2>
      <div>
        <label>Journal Entry ID</label>
        <input value={journalId} onChange={e => setJournalId(e.target.value)} />
        <button onClick={reconcileNow}>Reconcile</button>
      </div>
      <div>
        <label>Search notes:</label>
        <input value={notesSearch} onChange={e => setNotesSearch(e.target.value)} />
        <button onClick={() => refetchRecs()}>Filter</button>
        <button onClick={async () => {
          const exp = await trpc.finance.exportReconciliations.query({ journalEntryId: journalId || undefined });
          const rows = Array.isArray(exp) ? exp : [];
          const csv = ['ID,JournalEntryId,ReconciledBy,ReconciledAt,Notes', ...rows.map((r: any) => `${r.id},${r.journalEntryId},${r.reconciledBy},${r.reconciledAt},"${(r.notes || '').replace(/"/g, '""')}"`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reconciliations.csv'; a.click(); URL.revokeObjectURL(a.href);
          toast.success('Reconciliations exported');
        }}>Export CSV</button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Entry</TableHead><TableHead>By</TableHead><TableHead>When</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {Array.isArray(recs) && recs.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>{r.journalEntryId}</TableCell>
              <TableCell>{r.reconciledBy}</TableCell>
              <TableCell>{new Date(r.reconciledAt).toLocaleString()}</TableCell>
              <TableCell>{r.notes || '-'}</TableCell>
              <TableCell>
                <button onClick={() => doEdit(r.id)}>Edit</button>
                <button onClick={() => doUndo(r.id)}>Undo</button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </ModuleLayout>
  );
};

export default FinanceSettingsPage;