import React, { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
  isParent: boolean;
  children?: AccountNode[];
}

interface EditBalanceFormData {
  accountId: string;
  amount: number;
  operation: 'add' | 'subtract' | 'set';
}

export const ChartOfAccountsHierarchy: React.FC = () => {
  const { data: hierarchy, isLoading, refetch } = trpc.chartOfAccounts.getHierarchy.useQuery({});
  const { data: summary } = trpc.chartOfAccounts.getSummary.useQuery({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EditBalanceFormData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLevel, setEditingLevel] = useState(0);

  const updateBalanceMutation = trpc.chartOfAccounts.updateBalance.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      setEditingAccount(null);
    },
  });

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredHierarchy = useMemo(() => {
    if (!hierarchy || !searchTerm) return hierarchy;

    const filterAccounts = (accounts: AccountNode[]): AccountNode[] => {
      return accounts
        .filter(
          (acc) =>
            acc.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.accountName.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((acc) => ({
          ...acc,
          children: acc.children ? filterAccounts(acc.children) : [],
        }))
        .filter((acc) => acc.children && acc.children.length > 0 || acc.accountCode.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    return filterAccounts(hierarchy);
  }, [hierarchy, searchTerm]);

  const handleEditBalance = (account: AccountNode, level: number) => {
    setEditingLevel(level);
    setEditingAccount({
      accountId: account.id,
      amount: Math.abs(account.balance),
      operation: 'set',
    });
    setShowEditModal(true);
  };

  const handleSaveBalance = async () => {
    if (!editingAccount) return;

    await updateBalanceMutation.mutateAsync({
      accountId: editingAccount.accountId,
      amount: editingAccount.amount,
      operation: editingAccount.operation,
    });
  };

  const renderAccountNode = (account: AccountNode, level: number = 0) => {
    const isExpanded = expandedAccounts.has(account.id);
    const hasChildren = account.children && account.children.length > 0;
    const isParent = account.isParent;
    const paddingClass = level === 0 ? 'pl-4' : level === 1 ? 'pl-12' : level === 2 ? 'pl-20' : level === 3 ? 'pl-28' : 'pl-36';

    return (
      <div key={account.id} className="border-b hover:bg-gray-50">
        <div className={`flex items-center gap-2 px-4 py-3 ${paddingClass}`}>
          {hasChildren && (
            <button
              onClick={() => toggleExpand(account.id)}
              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <code
                className={`font-mono text-sm ${
                  isParent ? 'font-bold text-gray-900' : 'text-gray-700'
                }`}
              >
                {account.accountCode}
              </code>
              <span
                className={`${
                  isParent
                    ? 'font-bold text-gray-900'
                    : 'text-gray-700'
                }`}
              >
                {account.accountName}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                {account.accountType}
              </span>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div>
              <div className="font-mono font-semibold text-gray-900">
                Ksh {(account.balance / 100).toLocaleString('en-KE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-gray-500">Balance</div>
            </div>
            <button
              onClick={() => handleEditBalance(account, level)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
            >
              Edit
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="bg-gray-50">
            {account.children!.map((child) => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading Chart of Accounts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Assets</div>
            <div className="text-2xl font-bold text-green-600">
              Ksh {(summary.totalAssets / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Liabilities</div>
            <div className="text-2xl font-bold text-red-600">
              Ksh {(summary.totalLiabilities / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Equity</div>
            <div className="text-2xl font-bold text-blue-600">
              Ksh {(summary.totalEquity / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.totalRevenue / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="text-2xl font-bold text-orange-600">
              Ksh {(summary.totalExpenses / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Cost of Goods Sold</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.costofgoodssold / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Operating Expense</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.operatingExpense / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Capital Expenditure</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.capitalExpenditure / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Other Income</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.otherIncome / 100).toLocaleString('en-KE')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Other Expense</div>
            <div className="text-2xl font-bold text-purple-600">
              Ksh {(summary.otherExpense / 100).toLocaleString('en-KE')}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hierarchy View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 border-b font-semibold text-gray-900">
          Chart of Accounts Hierarchy
        </div>
        <div className="divide-y">
          {filteredHierarchy && filteredHierarchy.length > 0 ? (
            filteredHierarchy.map((account: AccountNode) => renderAccountNode(account))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              No accounts found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {showEditModal && editingAccount && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account Balance</DialogTitle>
              <DialogDescription>Update the balance for this account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="operation">Operation</Label>
                <Select
                  value={editingAccount.operation}
                  onValueChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      operation: e as 'add' | 'subtract' | 'set',
                    })
                  }
                >
                  <SelectTrigger id="operation" title="Select operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set Balance</SelectItem>
                    <SelectItem value="add">Add Amount</SelectItem>
                    <SelectItem value="subtract">Subtract Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (in KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={editingAccount.amount}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBalance}
                disabled={updateBalanceMutation.isPending}
              >
                {updateBalanceMutation.isPending ? 'Saving...' : 'Save Balance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
