import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Archive, Trash2, ArrowLeft, Search, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ClosedCase {
  id: number;
  accountNumber: string;
  caseName: string;
  debtorType: string;
  status: string;
  stage: string;
  originalAmount: string;
  outstandingAmount: string;
  organisationName: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityTime: string;
}

interface ClosedCaseManagementProps {
  onBack: () => void;
  isSuperAdmin?: boolean;
}

export default function ClosedCaseManagement({ onBack, isSuperAdmin = false }: ClosedCaseManagementProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString();
  };

  const { data: closedCases = [], isLoading, refetch } = useQuery<ClosedCase[]>({
    queryKey: ["/api/admin/closed-cases", startDate, endDate],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await apiRequest("GET", `/api/admin/closed-cases${queryString ? `?${queryString}` : ""}`);
      return response.json();
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (caseIds: number[]) => {
      const response = await apiRequest("POST", "/api/admin/cases/bulk-archive", { caseIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cases Archived",
        description: data.message,
      });
      setSelectedCases(new Set());
      setShowArchiveDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/closed-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive cases",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (caseIds: number[]) => {
      const response = await apiRequest("POST", "/api/admin/cases/bulk-delete", { caseIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cases Deleted",
        description: data.message,
      });
      setSelectedCases(new Set());
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/closed-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (error: any) => {
      const isForbidden = error?.message?.includes('403') || error?.message?.includes('Super admin');
      toast({
        title: isForbidden ? "Access Denied" : "Error",
        description: isForbidden 
          ? "Only super admins can delete cases. Please contact a super admin to perform this action."
          : "Failed to delete cases",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all cases (including archived - they can still be deleted)
      setSelectedCases(new Set(closedCases.map(c => c.id)));
    } else {
      setSelectedCases(new Set());
    }
  };

  const handleSelectCase = (caseId: number, checked: boolean) => {
    const newSelected = new Set(selectedCases);
    if (checked) {
      newSelected.add(caseId);
    } else {
      newSelected.delete(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleSearch = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedCases(new Set());
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(parseFloat(amount) || 0);
  };

  const nonArchivedCases = closedCases.filter(c => !c.isArchived);
  const selectedNonArchivedCount = Array.from(selectedCases).filter(
    id => nonArchivedCases.find(c => c.id === id)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Centre
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Closed Case Management
          </CardTitle>
          <CardDescription>
            All closed cases are shown below. Optionally filter by last updated date, then select cases to archive or delete in bulk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Updated From
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Updated To
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>

          {selectedCases.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="font-medium">{selectedCases.size} case(s) selected</span>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={selectedNonArchivedCount === 0}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Archive Selected
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : closedCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No closed cases found for the selected date range.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCases.size === closedCases.length && closedCases.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Case Name</TableHead>
                      <TableHead>Account No.</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedCases.map((case_) => (
                      <TableRow key={case_.id} className={case_.isArchived ? "opacity-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCases.has(case_.id)}
                            onCheckedChange={(checked) => handleSelectCase(case_.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{case_.caseName}</TableCell>
                        <TableCell>{case_.accountNumber}</TableCell>
                        <TableCell>{case_.organisationName}</TableCell>
                        <TableCell>{formatCurrency(case_.originalAmount)}</TableCell>
                        <TableCell>{formatCurrency(case_.outstandingAmount)}</TableCell>
                        <TableCell>{formatDate(case_.lastActivityTime)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="secondary">Closed</Badge>
                            {case_.isArchived && (
                              <Badge variant="outline">Archived</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-4">
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Checkbox
                    checked={selectedCases.size === closedCases.length && closedCases.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                {closedCases.map((case_) => (
                  <Card key={case_.id} className={case_.isArchived ? "opacity-50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedCases.has(case_.id)}
                          onCheckedChange={(checked) => handleSelectCase(case_.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{case_.caseName}</h4>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">Closed</Badge>
                              {case_.isArchived && (
                                <Badge variant="outline" className="text-xs">Archived</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{case_.accountNumber}</p>
                          <p className="text-sm">{case_.organisationName}</p>
                          <div className="flex justify-between text-sm">
                            <span>Original: {formatCurrency(case_.originalAmount)}</span>
                            <span>Outstanding: {formatCurrency(case_.outstandingAmount)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last activity: {formatDate(case_.lastActivityTime)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {closedCases.length} closed case(s)
                {nonArchivedCases.length < closedCases.length && ` (${closedCases.length - nonArchivedCases.length} already archived)`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archive Cases
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedNonArchivedCount} case(s)?
              <br /><br />
              Archived cases will be hidden from normal views but can be restored later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkArchiveMutation.mutate(Array.from(selectedCases))}
              disabled={bulkArchiveMutation.isPending}
              className="gap-2"
            >
              {bulkArchiveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Archive {selectedNonArchivedCount} Case(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Cases
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to <strong>permanently delete</strong> {selectedCases.size} case(s)?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All associated data will be permanently removed, including:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>All case activities and history</li>
                <li>All messages related to these cases</li>
                <li>All documents attached to these cases</li>
                <li>All payment records</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedCases))}
              disabled={bulkDeleteMutation.isPending}
              className="gap-2"
            >
              {bulkDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete {selectedCases.size} Case(s) Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
