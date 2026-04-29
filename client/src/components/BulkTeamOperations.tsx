import React, { useState } from "react";
import { X, AlertCircle, Check, Copy, Edit3, Trash2 } from "lucide-react";
import { trpc } from "../_trpc/client";
import Button from "./Button";
import Modal from "./Modal";
import Toast from "./Toast";

interface TeamMember {
  id: string;
  projectId: string;
  employeeId: string;
  role?: string;
  hoursAllocated?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface BulkTeamOperationsProps {
  teamMembers: TeamMember[];
  onOperationComplete: () => void;
  projectId: string;
}

export function BulkTeamOperations({
  teamMembers,
  onOperationComplete,
  projectId,
}: BulkTeamOperationsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [updateFields, setUpdateFields] = useState({
    role: "",
    hoursAllocated: "",
    startDate: "",
    endDate: "",
  });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const projectsQuery = trpc.projects.list.useQuery({ limit: 100 });
  const bulkReassignMutation = trpc.projects.teamMembers.bulkReassign.useMutation();
  const bulkUpdateMutation = trpc.projects.teamMembers.bulkUpdate.useMutation();
  const bulkDeleteMutation = trpc.projects.teamMembers.bulkDelete.useMutation();

  const toggleSelectAll = () => {
    if (selectedIds.size === teamMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teamMembers.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleReassign = async () => {
    if (!newProjectId) {
      setToast({ message: "Please select a destination project", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await bulkReassignMutation.mutateAsync({
        memberIds: Array.from(selectedIds),
        newProjectId,
      });

      if (result.successCount > 0) {
        setToast({
          message: `Successfully reassigned ${result.successCount} team member(s)`,
          type: "success",
        });
        setSelectedIds(new Set());
        setNewProjectId("");
        setShowReassignModal(false);
        onOperationComplete();
      }

      if (result.errors.length > 0) {
        setToast({ message: `Errors: ${result.errors.join(", ")}`, type: "error" });
      }
    } catch (error) {
      setToast({
        message: `Error reassigning: ${(error as any).message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    setIsLoading(true);
    try {
      const updates: any = {};
      if (updateFields.role) updates.role = updateFields.role;
      if (updateFields.hoursAllocated) updates.hoursAllocated = parseFloat(updateFields.hoursAllocated);
      if (updateFields.startDate) updates.startDate = updateFields.startDate;
      if (updateFields.endDate) updates.endDate = updateFields.endDate;

      if (Object.keys(updates).length === 0) {
        setToast({ message: "Please fill in at least one field to update", type: "error" });
        setIsLoading(false);
        return;
      }

      const result = await bulkUpdateMutation.mutateAsync({
        memberIds: Array.from(selectedIds),
        updates,
      });

      if (result.successCount > 0) {
        setToast({
          message: `Successfully updated ${result.successCount} team member(s)`,
          type: "success",
        });
        setSelectedIds(new Set());
        setUpdateFields({ role: "", hoursAllocated: "", startDate: "", endDate: "" });
        setShowBulkUpdateModal(false);
        onOperationComplete();
      }

      if (result.errors.length > 0) {
        setToast({ message: `Errors: ${result.errors.join(", ")}`, type: "error" });
      }
    } catch (error) {
      setToast({
        message: `Error updating: ${(error as any).message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        memberIds: Array.from(selectedIds),
      });

      if (result.successCount > 0) {
        setToast({
          message: `Successfully deleted ${result.successCount} team member(s)`,
          type: "success",
        });
        setSelectedIds(new Set());
        setShowConfirmDelete(false);
        onOperationComplete();
      }

      if (result.errors.length > 0) {
        setToast({ message: `Errors: ${result.errors.join(", ")}`, type: "error" });
      }
    } catch (error) {
      setToast({
        message: `Error deleting: ${(error as any).message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === teamMembers.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-blue-600 rounded cursor-pointer"
              />
              <span className="text-sm font-semibold text-blue-900">
                {selectedIds.size} team member(s) selected
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReassignModal(true)}
                disabled={isLoading}
                icon={<Copy className="w-4 h-4" />}
              >
                Reassign Project
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkUpdateModal(true)}
                disabled={isLoading}
                icon={<Edit3 className="w-4 h-4" />}
              >
                Bulk Update
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowConfirmDelete(true)}
                disabled={isLoading}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Header Checkbox */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={selectedIds.size === teamMembers.length && teamMembers.length > 0}
          onChange={toggleSelectAll}
          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
          title="Select/deselect all team members"
        />
        <span className="text-xs text-gray-600">Select all</span>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <Modal
          isOpen={showReassignModal}
          onClose={() => setShowReassignModal(false)}
          title="Reassign Team Members to Different Project"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Destination Project
              </label>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a project --</option>
                {Array.isArray(projectsQuery.data) && projectsQuery.data.map((proj: any) => (
                  <option key={proj.id} value={proj.id} disabled={proj.id === projectId}>
                    {proj.name}
                    {proj.id === projectId ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Note:</p>
                <p>This will move {selectedIds.size} team member(s) to the selected project.</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowReassignModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                isLoading={isLoading}
                disabled={!newProjectId || isLoading}
              >
                Reassign
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <Modal
          isOpen={showBulkUpdateModal}
          onClose={() => setShowBulkUpdateModal(false)}
          title="Bulk Update Team Members"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={updateFields.role}
                onChange={(e) => setUpdateFields({ ...updateFields, role: e.target.value })}
                placeholder="e.g., Lead Developer, Designer, QA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours Allocated (per week)
              </label>
              <input
                type="number"
                value={updateFields.hoursAllocated}
                onChange={(e) => setUpdateFields({ ...updateFields, hoursAllocated: e.target.value })}
                placeholder="e.g., 40"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={updateFields.startDate}
                  onChange={(e) => setUpdateFields({ ...updateFields, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={updateFields.endDate}
                  onChange={(e) => setUpdateFields({ ...updateFields, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Tip:</p>
                <p>Leave fields blank to skip updating them. Only filled fields will be updated.</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowBulkUpdateModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate} isLoading={isLoading}>
                Update {selectedIds.size}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <Modal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          title="Confirm Bulk Delete"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-4 flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Delete {selectedIds.size} team member(s)?</p>
                <p className="text-sm text-red-800 mt-1">
                  This action cannot be undone. These team members will be removed from the project.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                isLoading={isLoading}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete {selectedIds.size}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Inline Checkboxes in Table */}
      <div className="space-y-1">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.has(member.id)}
              onChange={() => toggleSelect(member.id)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>
        ))}
      </div>
    </>
  );
}

export default BulkTeamOperations;
